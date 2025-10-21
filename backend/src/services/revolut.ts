import { config } from '../config/env';

export interface CreateRevolutPaymentRequest {
  eventId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number; // in euros
}

export interface CreateRevolutPaymentResponse {
  paymentId: string;
  redirectUrl: string;
  creditId: string;
  expiresAt: string;
}

export class RevolutService {
  private static readonly API_URL = 'https://sandbox-b2b.revolut.com';
  private static readonly API_KEY = config.REVOLUT_API_KEY;

  static async createPayment(data: CreateRevolutPaymentRequest): Promise<CreateRevolutPaymentResponse> {
    if (!this.API_KEY || this.API_KEY.includes('placeholder')) {
      console.warn('Warning: Using mock Revolut payment. Real Revolut API key required.');
      
      // Mock response for development
      return {
        paymentId: `revolut_mock_${Date.now()}`,
        redirectUrl: `http://localhost:3001/mock-revolut-payment?amount=${data.amount}&name=${encodeURIComponent(data.customerName)}`,
        creditId: '', // Will be set by calling function
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };
    }

    try {
      const response = await fetch(`${this.API_URL}/api/1.0/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(data.amount * 100), // Amount in cents
          currency: 'EUR',
          capture_mode: 'AUTOMATIC',
          merchant_order_ext_ref: `order_${data.eventId}_${Date.now()}`,
          description: `Square purchase - ${data.customerName}`,
          customer_email: data.customerEmail,
          webhook_url: `${process.env.API_BASE_URL}/api/payment/revolut/webhook`,
          success_redirect_url: `${process.env.FRONTEND_URL}/payment-success`,
          failure_redirect_url: `${process.env.FRONTEND_URL}/payment-failed`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Revolut API error: ${response.status}`);
      }

      const result = await response.json() as any;
      
      return {
        paymentId: result.id as string,
        redirectUrl: result.redirect_url as string,
        creditId: '', // Will be set by calling function
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

    } catch (error) {
      console.error('Revolut payment creation failed:', error);
      throw new Error('Failed to create Revolut payment');
    }
  }

  static async getPaymentStatus(paymentId: string): Promise<string> {
    if (!this.API_KEY || this.API_KEY.includes('placeholder')) {
      // Mock status check
      return 'COMPLETED';
    }

    try {
      const response = await fetch(`${this.API_URL}/api/1.0/orders/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Revolut API error: ${response.status}`);
      }

      const result = await response.json() as any;
      return result.state as string; // PENDING, COMPLETED, FAILED, etc.

    } catch (error) {
      console.error('Failed to get Revolut payment status:', error);
      throw new Error('Failed to get payment status');
    }
  }

  static async refundPayment(paymentId: string, reason?: string): Promise<boolean> {
    if (!this.API_KEY || this.API_KEY.includes('placeholder')) {
      console.log('Mock Revolut refund processed');
      return true;
    }

    try {
      const response = await fetch(`${this.API_URL}/api/1.0/orders/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason || 'Square selection timeout',
        }),
      });

      return response.ok;

    } catch (error) {
      console.error('Failed to refund Revolut payment:', error);
      return false;
    }
  }
}