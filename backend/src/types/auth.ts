// JWT Payload types
export interface JWTPayload {
  adminId: string;
  iat?: number;
  exp?: number;
}

// Admin user type
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      admin?: AdminUser;
    }
  }
}