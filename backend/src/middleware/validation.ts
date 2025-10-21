import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

// Basic validation types
type ValidationRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'uuid';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
};

type ValidationSchema = {
  [key: string]: ValidationRule;
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (international format)
const PHONE_REGEX = /^\+?[\d\s\-\(\)]+$/;

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validation functions
const validateValue = (value: any, fieldName: string, rule: ValidationRule): string | null => {
  // Check if required field is missing
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }

  // Skip validation if field is not required and empty
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  if (rule.type) {
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${fieldName} must be a string`;
        }
        break;
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return `${fieldName} must be a valid number`;
        }
        value = num; // Convert to number for further validation
        break;
      case 'email':
        if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
          return `${fieldName} must be a valid email address`;
        }
        break;
      case 'phone':
        if (typeof value !== 'string' || !PHONE_REGEX.test(value)) {
          return `${fieldName} must be a valid phone number`;
        }
        break;
      case 'uuid':
        if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
          return `${fieldName} must be a valid UUID`;
        }
        break;
    }
  }

  // String length validation
  if (typeof value === 'string') {
    if (rule.minLength && value.length < rule.minLength) {
      return `${fieldName} must be at least ${rule.minLength} characters long`;
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      return `${fieldName} must be no more than ${rule.maxLength} characters long`;
    }
  }

  // Number range validation
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return `${fieldName} must be at least ${rule.min}`;
    }
    if (rule.max !== undefined && value > rule.max) {
      return `${fieldName} must be no more than ${rule.max}`;
    }
  }

  // Pattern validation
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
    return `${fieldName} format is invalid`;
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    return `${fieldName} must be one of: ${rule.enum.join(', ')}`;
  }

  return null;
};

// Sanitization functions
const sanitizeString = (value: string): string => {
  return value.trim().replace(/[<>]/g, ''); // Basic XSS protection
};

const sanitizeInput = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
  }
  return obj;
};

// Main validation middleware
export const validateBody = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Sanitize input
    req.body = sanitizeInput(req.body);

    // Validate each field in schema
    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = req.body[fieldName];
      const error = validateValue(value, fieldName, rule);
      if (error) {
        errors.push(error);
      }
    }

    // Check for errors
    if (errors.length > 0) {
      next(new ValidationError(`Validation failed: ${errors.join(', ')}`));
      return;
    }

    next();
  };
};

// Validate query parameters
export const validateQuery = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = req.query[fieldName];
      const error = validateValue(value, fieldName, rule);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      next(new ValidationError(`Query validation failed: ${errors.join(', ')}`));
      return;
    }

    next();
  };
};

// Validate path parameters
export const validateParams = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [fieldName, rule] of Object.entries(schema)) {
      const value = req.params[fieldName];
      const error = validateValue(value, fieldName, rule);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      next(new ValidationError(`Parameter validation failed: ${errors.join(', ')}`));
      return;
    }

    next();
  };
};

// Custom validation for payment intent (requires either email or phone)
export const validatePaymentIntent = (req: Request, res: Response, next: NextFunction): void => {
  const errors: string[] = [];

  // First validate with the common schema
  req.body = sanitizeInput(req.body);

  for (const [fieldName, rule] of Object.entries(commonSchemas.createPaymentIntent)) {
    const value = req.body[fieldName];
    const error = validateValue(value, fieldName, rule);
    if (error) {
      errors.push(error);
    }
  }

  // Then check either email or phone requirement
  const emailPhoneError = validateEitherEmailOrPhone(req);
  if (emailPhoneError) {
    errors.push(emailPhoneError);
  }

  if (errors.length > 0) {
    next(new ValidationError(`Validation failed: ${errors.join(', ')}`));
    return;
  }

  next();
};

// Custom validation function for either email or phone
const validateEitherEmailOrPhone = (req: any): string | null => {
  const { customerEmail, customerPhone } = req.body;
  
  const hasEmail = customerEmail && customerEmail.trim();
  const hasPhone = customerPhone && customerPhone.trim();
  
  if (!hasEmail && !hasPhone) {
    return 'Either email or phone number is required';
  }
  
  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return 'Invalid email format';
  }
  
  if (hasPhone && !/^\+?[\d\s\-\(\)]+$/.test(customerPhone)) {
    return 'Invalid phone format';
  }
  
  return null;
};

// Common validation schemas
export const commonSchemas = {
  // Payment intent creation
  createPaymentIntent: {
    eventId: { required: true, type: 'string' as const },
    customerName: { required: true, type: 'string' as const, minLength: 2, maxLength: 100 },
    customerEmail: { required: false, type: 'email' as const },
    customerPhone: { required: false, type: 'phone' as const }
  },

  // Admin login
  adminLogin: {
    username: { required: true, type: 'string' as const, minLength: 3, maxLength: 50 },
    password: { required: true, type: 'string' as const, minLength: 6 }
  },

  // Square selection
  selectSquare: {
    creditId: { required: true, type: 'uuid' as const },
    squareId: { required: true, type: 'uuid' as const }
  },

  // Event ID parameter
  eventId: {
    id: { required: true, type: 'uuid' as const }
  },

  // Credit ID parameter
  creditId: {
    creditId: { required: true, type: 'uuid' as const }
  }
};