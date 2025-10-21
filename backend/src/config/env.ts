import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentConfig {
  // Server
  PORT: number;
  NODE_ENV: string;
  FRONTEND_URL: string;
  
  // Database
  DATABASE_URL: string;
  
  // Authentication
  JWT_SECRET: string;
  
  // Payment Services
  REVOLUT_API_KEY: string;
  SHOPIFY_WEBHOOK_SECRET?: string;
  
  // Development flags
  IS_DEVELOPMENT: boolean;
}

class ConfigValidator {
  private static instance: EnvironmentConfig;

  static validate(): EnvironmentConfig {
    if (this.instance) {
      return this.instance;
    }

    const errors: string[] = [];
    
    // Required environment variables
    const requiredVars = {
      PORT: process.env.PORT || '3001',
      NODE_ENV: process.env.NODE_ENV || 'development',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
    };

    // Validate required variables
    if (!requiredVars.DATABASE_URL) {
      errors.push('DATABASE_URL is required');
    }

    if (!requiredVars.JWT_SECRET) {
      errors.push('JWT_SECRET is required for authentication');
    }

    // Payment service validation (only required in production)
    const revolutKey = process.env.REVOLUT_API_KEY;
    
    const isProduction = requiredVars.NODE_ENV === 'production';
    const hasPlaceholderKeys = revolutKey?.includes('placeholder');

    if (isProduction && hasPlaceholderKeys) {
      errors.push('Production environment requires real Revolut API key');
    }

    if (errors.length > 0) {
      console.error('❌ Environment validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    this.instance = {
      PORT: parseInt(requiredVars.PORT, 10),
      NODE_ENV: requiredVars.NODE_ENV,
      FRONTEND_URL: requiredVars.FRONTEND_URL,
      DATABASE_URL: requiredVars.DATABASE_URL!,
      JWT_SECRET: requiredVars.JWT_SECRET!,
      REVOLUT_API_KEY: revolutKey || 'revolut_placeholder_key',
      SHOPIFY_WEBHOOK_SECRET: process.env.SHOPIFY_WEBHOOK_SECRET,
      IS_DEVELOPMENT: requiredVars.NODE_ENV !== 'production',
    };

    // Log successful validation
    console.log('✅ Environment configuration validated');
    if (this.instance.IS_DEVELOPMENT) {
      console.log('🔧 Running in development mode with placeholder keys');
    }

    return this.instance;
  }

  static get(): EnvironmentConfig {
    if (!this.instance) {
      throw new Error('Configuration not validated. Call validate() first.');
    }
    return this.instance;
  }
}

export const config = ConfigValidator.validate();
export { EnvironmentConfig };