import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { GAME_CONFIG } from '../config/gameConfig';
import './SquareSelectionModal.css';

interface SquareSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SquareSelectionModal: React.FC<SquareSelectionModalProps> = ({ isOpen, onClose }) => {
  const { 
    paymentCredit, 
    squares, 
    selectedSquareId, 
    setSelectedSquare, 
    selectSquare, 
    loading,
    error,
    clearError
  } = useGameStore();

  // Helper function to generate proper position label from grid coordinates
  const getPositionLabel = (gridX: number, gridY: number, fallbackPosition?: string) => {
    if (fallbackPosition && fallbackPosition !== `${gridX + 1},${gridY + 1}`) {
      return fallbackPosition;
    }
    
    const columnLabel = GAME_CONFIG.labels.columns[gridX] || 'A';
    const rowLabel = GAME_CONFIG.labels.rows[gridY] || 1;
    return `${columnLabel}${rowLabel}`;
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSquareClick = (squareId: string, status: string) => {
    if (status === 'TAKEN') return;
    if (!paymentCredit) return;
    
    setSelectedSquare(squareId);
  };

  const handleConfirmSelection = async () => {
    if (!selectedSquareId) return;
    await selectSquare(selectedSquareId);
  };

  const getTimeRemaining = () => {
    if (!paymentCredit?.expiresAt) return '';
    
    const now = new Date();
    const expires = new Date(paymentCredit.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const availableSquares = squares.filter(square => square.status === 'AVAILABLE');
  const selectedSquare = squares.find(square => square.id === selectedSquareId);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content square-selection-modal">
        <div className="modal-header">
          <h2>🎯 Select Your Square</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <span>❌ {error}</span>
              <button onClick={clearError}>×</button>
            </div>
          )}

          <div className="payment-status">
            {paymentCredit?.status === 'PENDING' && (
              <div className="status-pending">
                <div className="spinner"></div>
                <span>💳 Payment ready! Select your square to complete the purchase.</span>
              </div>
            )}
            
            {paymentCredit?.status === 'CONFIRMED' && (
              <div className="status-confirmed">
                <span>✅ Payment confirmed! Select your square.</span>
                <div className="timer">
                  Time remaining: <strong>{getTimeRemaining()}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="selection-info">
            <div className="customer-info">
              <strong>{paymentCredit?.customerName}</strong>
            </div>
            <div className="squares-available">
              {availableSquares.length} squares available
            </div>
          </div>

          <div className="squares-grid">
            {squares.map((square) => (
              <button
                key={square.id}
                className={`square-button ${square.status.toLowerCase()} ${
                  selectedSquareId === square.id ? 'selected' : ''
                }`}
                onClick={() => handleSquareClick(square.id, square.status)}
                disabled={square.status === 'TAKEN' || !paymentCredit}
                title={`Square ${getPositionLabel(square.gridX, square.gridY, square.position)} - ${square.status}`}
              >
                <div className="square-number">{getPositionLabel(square.gridX, square.gridY, square.position)}</div>
                {square.status === 'TAKEN' && square.ownerInitials && (
                  <div className="square-owner">{square.ownerInitials}</div>
                )}
              </button>
            ))}
          </div>

          <div className="selection-details">
            {selectedSquare && (
              <div className="selected-square-info">
                <h4>Selected Square</h4>
                <p>
                  <strong>Square {getPositionLabel(selectedSquare.gridX, selectedSquare.gridY, selectedSquare.position)}</strong>
                  <br />
                  Grid coordinates: {selectedSquare.gridX}, {selectedSquare.gridY}
                </p>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button 
              onClick={handleConfirmSelection}
              className="confirm-button"
              disabled={!selectedSquareId || !paymentCredit || loading}
            >
              {loading ? 'Confirming...' : 'Confirm Selection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};