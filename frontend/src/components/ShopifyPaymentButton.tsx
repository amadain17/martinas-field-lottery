import React from 'react';
import { useGameStore } from '../store/gameStore';

interface ShopifyPaymentButtonProps {
  eventId: string;
  onPaymentSuccess: (creditId: string) => void;
}

export const ShopifyPaymentButton: React.FC<ShopifyPaymentButtonProps> = ({ 
  eventId, 
  onPaymentSuccess 
}) => {
  const shopifyStoreUrl = 'https://rathdrum-u16-girls.myshopify.com';
  const lotteryProductHandle = 'horse-poo-lottery-square'; // Will be set up in Shopify

  const handleShopifyPayment = () => {
    // Create the Shopify product URL with lottery metadata
    const productUrl = `${shopifyStoreUrl}/products/${lotteryProductHandle}`;
    
    // Add URL parameters to track the lottery event
    const urlParams = new URLSearchParams({
      event_id: eventId,
      lottery_app: 'true',
      return_url: `${window.location.origin}/shopify-return`
    });

    // Redirect to Shopify product page
    window.location.href = `${productUrl}?${urlParams}`;
  };

  return (
    <div className="shopify-payment-section">
      <h3>🛒 Buy with Shop Pay</h3>
      <p>Fast, secure checkout with Shop Pay - saved payment methods and instant processing.</p>
      
      <button 
        onClick={handleShopifyPayment}
        className="shopify-buy-button"
        style={{
          backgroundColor: '#5a31f4',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%',
          marginTop: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <span>🛒</span>
        Buy Square with Shop Pay - €10.00
      </button>
      
      <div className="payment-info" style={{ 
        fontSize: '12px', 
        color: '#666', 
        marginTop: '8px',
        textAlign: 'center' 
      }}>
        Secure payment processed by Shopify • After payment, return here to select your square
      </div>
    </div>
  );
};