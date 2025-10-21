import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/env';
import { AuthenticationError } from './errorHandler';

// Stripe webhook verification removed - Shop Pay handles card payments securely

// Revolut webhook signature verification
export const verifyRevolutWebhook = (req: Request, res: Response, next: NextFunction): void => {
  if (config.IS_DEVELOPMENT && config.REVOLUT_API_KEY.includes('placeholder')) {
    console.warn('⚠️ Revolut webhook verification disabled in development mode');
    next();
    return;
  }

  const signature = req.headers['revolut-signature'] as string;
  
  if (!signature) {
    next(new AuthenticationError('Missing Revolut signature'));
    return;
  }

  try {
    // Revolut uses HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', config.REVOLUT_API_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      next(new AuthenticationError('Invalid Revolut webhook signature'));
      return;
    }

    next();
  } catch (error) {
    next(new AuthenticationError('Revolut webhook verification failed'));
  }
};

// Rate limiting for sensitive operations
interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const rateLimitStore: RateLimitStore = {};

export const createRateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    Object.keys(rateLimitStore).forEach(key => {
      const entry = rateLimitStore[key];
      if (entry && entry.resetTime < now) {
        delete rateLimitStore[key];
      }
    });

    // Check current client
    if (!rateLimitStore[clientId]) {
      rateLimitStore[clientId] = { count: 1, resetTime: now + windowMs };
      next();
      return;
    }

    if (rateLimitStore[clientId].resetTime < now) {
      rateLimitStore[clientId] = { count: 1, resetTime: now + windowMs };
      next();
      return;
    }

    if (rateLimitStore[clientId].count >= maxRequests) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((rateLimitStore[clientId].resetTime - now) / 1000)
      });
      return;
    }

    rateLimitStore[clientId].count++;
    next();
  };
};

// Common rate limits
export const authRateLimit = createRateLimit(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const paymentRateLimit = createRateLimit(10, 60 * 1000); // 10 payments per minute
export const generalRateLimit = createRateLimit(100, 60 * 1000); // 100 requests per minute