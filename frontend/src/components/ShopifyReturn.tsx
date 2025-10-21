import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export const ShopifyReturn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadPaymentCredit } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentCredit, setPaymentCredit] = useState<any>(null);

  useEffect(() => {
    const handleShopifyReturn = async () => {
      try {
        // Get parameters from Shopify return URL
        const orderId = searchParams.get('order_id');
        const eventId = searchParams.get('event_id');
        
        if (!orderId || !eventId) {
          throw new Error('Missing order or event information');
        }

        // Check if payment credit was already created by webhook
        // If not, create it manually (backup in case webhook failed)
        const response = await fetch(`/api/payment/shopify/check-order/${orderId}`);
        
        if (!response.ok) {
          // Order not found, create payment credit manually
          const createResponse = await fetch('/api/payment/shopify/create-credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shopifyOrderId: orderId,
              eventId: eventId,
              customerName: searchParams.get('customer_name') || 'Shopify Customer',
              customerEmail: searchParams.get('customer_email'),
              customerPhone: searchParams.get('customer_phone'),
            }),
          });

          if (!createResponse.ok) {
            throw new Error('Failed to create payment credit');
          }

          const creditData = await createResponse.json();
          setPaymentCredit(creditData);
        } else {
          const orderData = await response.json();
          setPaymentCredit(orderData);
        }

        setLoading(false);
      } catch (err) {
        console.error('Shopify return error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    handleShopifyReturn();
  }, [searchParams]);

  const handleSelectSquare = () => {
    if (paymentCredit?.creditId) {
      // Load the payment credit and redirect to square selection
      loadPaymentCredit(paymentCredit.creditId);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="shopify-return-container" style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div className="spinner" style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #5a31f4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <h2>Processing your payment...</h2>
        <p>Please wait while we confirm your lottery square purchase.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shopify-return-container" style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{ color: '#d32f2f', marginBottom: '20px' }}>
          <h2>❌ Payment Processing Error</h2>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          style={{
            backgroundColor: '#5a31f4',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 24px',
            cursor: 'pointer'
          }}
        >
          Return to Lottery
        </button>
      </div>
    );
  }

  return (
    <div className="shopify-return-container" style={{ 
      padding: '40px 20px', 
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '30px' }}>
        <h2>✅ Payment Successful!</h2>
        <p>Your lottery square purchase has been confirmed.</p>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          margin: '20px 0'
        }}>
          <strong>Amount Paid: €{paymentCredit?.amount || '10.00'}</strong>
          <br />
          <small>Payment ID: {paymentCredit?.creditId}</small>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>🎯 Next Step: Select Your Square</h3>
        <p>You have <strong>15 minutes</strong> to choose your lottery square position.</p>
      </div>

      <button 
        onClick={handleSelectSquare}
        style={{
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '16px 32px',
          fontSize: '18px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%',
          maxWidth: '300px'
        }}
      >
        Select My Square Now
      </button>

      <div style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginTop: '20px'
      }}>
        Your payment is secure and processed by Shopify. 
        You can view your order in your Shopify account.
      </div>
    </div>
  );
};