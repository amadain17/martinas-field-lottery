const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
console.log('🔗 API Service initialized with base URL:', API_BASE_URL);

export interface Event {
  id: string;
  name: string;
  status: 'DRAFT' | 'SELLING' | 'SOLD_OUT' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  squarePrice: number;
  gridCols: number;
  gridRows: number;
  totalSquares: number;
  soldSquares: number;
  description?: string;
  teamAName?: string;
  teamBName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Square {
  id: string;
  squareNumber: number;
  gridX: number;
  gridY: number;
  position: string;
  status: 'AVAILABLE' | 'TAKEN' | 'RESERVED';
  ownerInitials?: string;
  selectedAt?: string;
}

export interface PaymentCredit {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'USED' | 'REFUNDED' | 'EXPIRED';
  amount: number;
  expiresAt: string;
  customerName: string;
  canSelectSquare: boolean;
}

export interface CreatePaymentIntentRequest {
  eventId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  creditId: string;
  amount: number;
  expiresAt: string;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 Making API request to: ${url}`);
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Events
  async getEvents(): Promise<{ events: Event[] }> {
    return this.request('/events');
  }

  async getEvent(id: string): Promise<{ event: Event }> {
    return this.request(`/events/${id}`);
  }

  // Squares
  async getEventSquares(eventId: string): Promise<{ squares: Square[] }> {
    return this.request(`/events/${eventId}/squares`);
  }

  async selectSquare(creditId: string, squareId: string): Promise<{
    success: boolean;
    confirmationCode: string;
    square: {
      id: string;
      squareNumber: number;
      gridX: number;
      gridY: number;
    };
  }> {
    return this.request('/squares/select', {
      method: 'POST',
      body: JSON.stringify({ creditId, squareId }),
    });
  }

  // Payment
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    return this.request('/payment/create-intent', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentCredit(creditId: string): Promise<PaymentCredit> {
    return this.request(`/payment/credit/${creditId}`);
  }
}

export const apiService = new ApiService();