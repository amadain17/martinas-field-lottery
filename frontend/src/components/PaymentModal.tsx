import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ShopifyPaymentButton } from './ShopifyPaymentButton';
import './PaymentModal.css';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [creditId, setCreditId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'shopify' | 'revolut' | 'cash'>('shopify');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { currentEvent, createPaymentIntent, loading, selectedSquareId, squares, loadPaymentCredit } = useGameStore();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (paymentMethod === 'cash') {
      // For cash payments, only credit ID is required
      if (!creditId.trim()) {
        newErrors.creditId = 'Credit ID is required for cash payments';
      }
    } else {
      // For card/revolut payments, name and contact info are required
      if (!customerName.trim()) {
        newErrors.name = 'Name is required';
      }

      const hasEmail = customerEmail.trim();
      const hasPhone = customerPhone.trim();

      if (!hasEmail && !hasPhone) {
        newErrors.contact = 'Either email or phone number is required';
      } else {
        if (hasEmail && !/\S+@\S+\.\S+/.test(customerEmail)) {
          newErrors.email = 'Invalid email format';
        }
        if (hasPhone && !/^\+?[\d\s\-\(\)]+$/.test(customerPhone)) {
          newErrors.phone = 'Invalid phone format';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (paymentMethod === 'cash') {
      // For cash payments, load the credit and proceed to square selection
      await loadPaymentCredit(creditId);
      onClose();
    } else {
      // For revolut payments, create payment intent
      await createPaymentIntent(customerName, customerEmail, customerPhone);
    }
  };

  const selectedSquare = selectedSquareId ? squares.find(s => s.id === selectedSquareId) : null;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>💳 Buy Square Credit</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="payment-info">
            <h3>Event: {currentEvent?.name}</h3>
            <p>Price per square: <strong>€{currentEvent?.squarePrice}</strong></p>
            {selectedSquare && (
              <div className="selected-square-info">
                <p><strong>Selected Square: {selectedSquare.position}</strong></p>
                <p>Grid position: ({selectedSquare.gridX + 1}, {selectedSquare.gridY + 1})</p>
              </div>
            )}
            <p className="payment-note">
              ℹ️ {selectedSquare ? 'Complete payment to secure this square.' : 'You\'ll pay first, then select your square from available options.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="payment-form">
            {paymentMethod === 'cash' ? (
              <div className="form-group">
                <label htmlFor="creditId">Payment Credit ID *</label>
                <input
                  id="creditId"
                  type="text"
                  value={creditId}
                  onChange={(e) => setCreditId(e.target.value)}
                  placeholder="Enter your credit ID from admin"
                  className={errors.creditId ? 'error' : ''}
                />
                {errors.creditId && <span className="error-message">{errors.creditId}</span>}
                <p className="contact-note">Get this ID from the admin after paying cash</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    id="name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                {errors.contact && (
                  <div className="form-group">
                    <span className="error-message">{errors.contact}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className={errors.phone ? 'error' : ''}
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>

                <p className="contact-note">* Either email or phone number is required</p>
              </>
            )}

            <div className="payment-section">
              <h4>Payment Method</h4>
              <div className="payment-methods">
                <div 
                  className={`payment-method-card ${paymentMethod === 'shopify' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('shopify')}
                >
                  <div className="method-icon">🛒</div>
                  <div className="method-info">
                    <h5>Shop Pay (Recommended)</h5>
                    <p>Fast, secure checkout with saved payment methods</p>
                    <p className="fees">Instant processing • Most secure</p>
                  </div>
                </div>

                <div 
                  className={`payment-method-card ${paymentMethod === 'revolut' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('revolut')}
                >
                  <div className="method-icon">🔄</div>
                  <div className="method-info">
                    <h5>Revolut</h5>
                    <p>Secure payment with Revolut Business</p>
                    <p className="fees">Lower fees for Irish customers</p>
                  </div>
                </div>
                

                <div 
                  className={`payment-method-card ${paymentMethod === 'cash' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <div className="method-icon">💵</div>
                  <div className="method-info">
                    <h5>Cash Payment</h5>
                    <p>Already paid cash? Enter your credit ID</p>
                    <p className="fees">Get credit ID from admin</p>
                  </div>
                </div>
              </div>
            </div>

            {paymentMethod === 'shopify' && currentEvent && (
              <ShopifyPaymentButton 
                eventId={currentEvent.id}
                onPaymentSuccess={(creditId) => {
                  loadPaymentCredit(creditId);
                  onClose();
                }}
              />
            )}

            {paymentMethod !== 'shopify' && (
              <div className="form-actions">
                <button type="button" onClick={onClose} className="cancel-button">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="pay-button"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 
                    paymentMethod === 'cash' ? 'Use Cash Credit ID' :
                    `Pay €${currentEvent?.squarePrice} with Revolut`
                  }
                </button>
              </div>
            )}

            {paymentMethod === 'shopify' && (
              <div className="form-actions">
                <button type="button" onClick={onClose} className="cancel-button">
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};