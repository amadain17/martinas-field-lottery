import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

// Custom Error Classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// Error Response Interface
interface ErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
  path: string;
}

// Global Error Handler Middleware
export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error for debugging
  console.error('❌ Error occurred:', {
    message: err.message,
    stack: config.IS_DEVELOPMENT ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error values
  let statusCode = 500;
  let message = 'Internal server error';
  let details: string | undefined;

  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.message;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Resource already exists';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      default:
        statusCode = 400;
        message = 'Database operation failed';
    }
  }

  // Create error response
  const errorResponse: ErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add details in development mode
  if (config.IS_DEVELOPMENT && details) {
    errorResponse.details = details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async Error Wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};