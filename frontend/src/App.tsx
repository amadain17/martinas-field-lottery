import { useEffect, useState } from 'react';
import './App.css';
import { FieldMap } from './components/FieldMap';
import { PaymentModal } from './components/PaymentModal';
import { SquareSelectionModal } from './components/SquareSelectionModal';
import { AdminPanel } from './components/AdminPanel';
import { useGameStore } from './store/gameStore';
import { GAME_CONFIG, CALCULATED_VALUES } from './config/gameConfig';
import horsePooingMoney from './assets/horse_pooping_money.svg';

function App() {
  const [showAdmin, setShowAdmin] = useState(() => {
    return window.location.pathname === '/admin' || window.location.hash === '#admin';
  });
  
  const { 
    currentEvent, 
    squares,
    showPaymentModal, 
    setShowPaymentModal,
    showSquareSelection, 
    setShowSquareSelection,
    error, 
    clearError,
    initialize
  } = useGameStore();

  useEffect(() => {
    console.log('🚀 App useEffect called - starting initialization');
    initialize().catch(console.error);
    
    // Reduced polling frequency since we now have efficient change detection
    let pollCount = 0;
    const pollInterval = window.setInterval(() => {
      pollCount++;
      console.log(`⏰ Polling #${pollCount} for square updates...`);
      const { loadSquares } = useGameStore.getState();
      loadSquares('demo-event-1').catch(console.error);
    }, 10000); // 10 seconds - reduced frequency since we have efficient updates
    
    console.log('⏰ Started polling for square updates every 10 seconds');
    
    // Cleanup polling on unmount
    return () => {
      console.log('🧹 App unmounting - stopping polling');
      window.clearInterval(pollInterval);
    };
  }, []); // Empty dependency array - run only once on mount

  const totalSquares = GAME_CONFIG.grid.totalSquares;
  const soldSquares = squares.filter(square => square.status === 'TAKEN').length;
  const availableSquares = totalSquares - soldSquares;

  // Show admin panel if requested
  if (showAdmin) {
    return (
      <div className="App">
        <AdminPanel eventId="demo-event-1" />
        <button 
          onClick={() => setShowAdmin(false)}
          style={{ 
            position: 'fixed', 
            top: '10px', 
            right: '10px', 
            background: '#e74c3c', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '4px' 
          }}
        >
          ← Back to Game
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <img src={horsePooingMoney} alt="Horse Pooping Money" className="header-logo" />
          <div className="header-text">
            <h1>Horse Poo Bingo</h1>
            <p>Buy a square and see what the horse thinks of your choice!</p>
          </div>
        </div>
        {currentEvent && (
          <div className="event-status">
            <span className={`status-badge ${currentEvent.status.toLowerCase()}`}>
              {currentEvent.status}
            </span>
            {currentEvent.status === 'COMPLETED' && (
              <div className="winner-announcement">
                🎉 Game completed! Check results for winners.
              </div>
            )}
          </div>
        )}
      </header>

      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}
      
      <main>
        <div className="map-section">
          <h2>Where will the horse poop?</h2>
          <div className="legend">
            <span className="legend-item">
              <span className="legend-color available"></span>
              Available
            </span>
            <span className="legend-item">
              <span className="legend-color sold"></span>
              Sold
            </span>
          </div>
          {currentEvent && squares.length > 0 ? (
            <FieldMap 
              center={GAME_CONFIG.map.center}
              zoom={GAME_CONFIG.map.zoom}
              gridCols={GAME_CONFIG.grid.cols}
              gridRows={GAME_CONFIG.grid.rows}
              squares={squares}
            />
          ) : (
            <div style={{ height: '500px', background: '#f0f0f0', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div>Loading map and squares... Event: {currentEvent ? '✓' : '✗'}, Squares: {squares.length}</div>
            </div>
          )}
        </div>
        
        <div className="info-section">
          <div className="stats">
            <div className="stat">
              <h3>Squares Available</h3>
              <p>{availableSquares} / {totalSquares}</p>
            </div>
            <div className="stat">
              <h3>Price per Square</h3>
              <p>{GAME_CONFIG.pricing.currencySymbol}{GAME_CONFIG.pricing.squarePrice.toFixed(2)}</p>
            </div>
            <div className="stat">
              <h3>Prize Pool</h3>
              <p>{GAME_CONFIG.pricing.currencySymbol}{CALCULATED_VALUES.totalPrizePool.toFixed(2)}</p>
            </div>
          </div>
          
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
          </div>

          <div className="how-it-works">
            <h3>How it works:</h3>
            <ol>
              <li>🎯 Choose your square from the grid</li>
              <li>💳 Pay with Revolut, card, or enter cash credit ID</li>
              <li>🎉 Win prizes when the horse colours your square!</li>
            </ol>
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              onClick={() => setShowAdmin(true)}
              style={{ 
                background: '#34495e', 
                color: 'white', 
                border: 'none', 
                padding: '6px 12px', 
                borderRadius: '4px', 
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🛠️ Admin
            </button>
          </div>
        </div>
      </main>

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />

      <SquareSelectionModal 
        isOpen={showSquareSelection}
        onClose={() => setShowSquareSelection(false)}
      />
    </div>
  );
}

export default App;