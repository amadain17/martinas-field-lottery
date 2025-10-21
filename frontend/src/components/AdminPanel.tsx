import React, { useState, useEffect, useCallback } from 'react';
import './AdminPanel.css';

interface AdminPanelProps {
  eventId: string;
}

interface PaymentCredit {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  status: string;
  paymentMethod: 'card' | 'cash' | 'revolut';
  selectedSquare?: {
    number: number;
    position: string;
    confirmationCode: string;
  };
  createdAt: string;
  expiresAt: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ eventId }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [credits, setCredits] = useState<PaymentCredit[]>([]);
  const [showCashForm, setShowCashForm] = useState(false);
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [showWinnerForm, setShowWinnerForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastCreditId, setLastCreditId] = useState('');
  const [eventStatus, setEventStatus] = useState<string>('SELLING');
  const [winnerSquare, setWinnerSquare] = useState<string>('');
  
  // Database query
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Cash payment form
  const [cashForm, setCashForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: '',
  });

  const loadEventStatus = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEventStatus(data.event?.status || 'SELLING');
      }
    } catch (err) {
      console.error('Failed to load event status:', err);
    }
  }, [eventId]);

  const loadCredits = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      const response = await fetch(`http://localhost:3001/api/admin/event/${eventId}/credits`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        // Token expired or invalid, clear it and require re-login
        localStorage.removeItem('adminToken');
        setIsLoggedIn(false);
        setError('Session expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load credits');
      }

      const data = await response.json();
      setCredits(data.credits);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    }
  }, [eventId]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsLoggedIn(true);
      loadCredits();
    }
    loadEventStatus();
  }, [loadCredits, loadEventStatus]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();
      localStorage.setItem('adminToken', data.token);
      setIsLoggedIn(true);
      await loadCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };


  const handleCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate that either email or phone is provided
    if (!cashForm.customerEmail.trim() && !cashForm.customerPhone.trim()) {
      setError('Either email or phone number is required');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsLoggedIn(false);
        setError('Please log in first');
        return;
      }

      const response = await fetch('http://localhost:3001/api/admin/cash-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          ...cashForm,
        }),
      });

      if (response.status === 401) {
        // Token expired or invalid, clear it and require re-login
        localStorage.removeItem('adminToken');
        setIsLoggedIn(false);
        setError('Session expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to create cash payment');
      }

      const data = await response.json();
      
      // Store the credit ID for display
      setLastCreditId(data.creditId);
      
      // Show success message and copy Credit ID to clipboard
      navigator.clipboard.writeText(data.creditId).then(() => {
        alert(`✅ Cash payment created successfully!\n\nCredit ID: ${data.creditId}\n\n📋 Credit ID has been copied to clipboard!\n\nInstructions for customer:\n1. Go to ${window.location.origin}\n2. Click "💵 I Paid Cash - Enter Credit ID"\n3. Paste the Credit ID\n4. Select their square`);
      }).catch(() => {
        alert(`✅ Cash payment created successfully!\n\nCredit ID: ${data.creditId}\n\n⚠️ Could not copy to clipboard. Please copy the Credit ID manually.\n\nInstructions for customer:\n1. Go to ${window.location.origin}\n2. Click "💵 I Paid Cash - Enter Credit ID"\n3. Enter the Credit ID\n4. Select their square`);
      });
      
      setCashForm({ customerName: '', customerEmail: '', customerPhone: '', notes: '' });
      setShowCashForm(false);
      await loadCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cash payment');
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryLoading(true);
    setError('');
    setQueryResult(null);
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:3001/api/admin/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Query failed');
      }

      setQueryResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleSetWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setIsLoggedIn(false);
        setError('Please log in first');
        return;
      }

      // Find the square by position
      const selectedCredit = credits.find(credit => 
        credit.selectedSquare?.position === winnerSquare
      );

      if (!selectedCredit || !selectedCredit.selectedSquare) {
        setError('Square not found or not purchased');
        return;
      }

      // We need to get the square ID - let's search via query first
      const queryResponse = await fetch('http://localhost:3001/api/admin/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: `SELECT id FROM squares WHERE position = '${winnerSquare}' AND eventId = '${eventId}'`
        }),
      });

      const queryResult = await queryResponse.json();
      if (!queryResult.data || queryResult.data.length === 0) {
        setError('Square not found');
        return;
      }

      const squareId = queryResult.data[0].id;

      const response = await fetch(`http://localhost:3001/api/admin/event/${eventId}/set-winner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ squareId }),
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        setIsLoggedIn(false);
        setError('Session expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set winner');
      }

      const data = await response.json();
      
      const contactInfo = [];
      if (data.winner.customerEmail) contactInfo.push(`Email: ${data.winner.customerEmail}`);
      if (data.winner.customerPhone) contactInfo.push(`Phone: ${data.winner.customerPhone}`);
      
      alert(`🎉 Game completed!\n\nWinner: ${data.winner.customerName}\nSquare: ${data.winner.position} (#${data.winner.squareNumber})\nConfirmation Code: ${data.winner.confirmationCode}\n\nContact Details:\n${contactInfo.join('\n') || 'No contact information available'}`);
      
      setWinnerSquare('');
      setShowWinnerForm(false);
      setEventStatus('COMPLETED');
      await loadCredits();
      await loadEventStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set winner');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setCredits([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '#27ae60';
      case 'USED': return '#3498db';
      case 'PENDING': return '#f39c12';
      case 'EXPIRED': return '#e74c3c';
      case 'REFUNDED': return '#95a5a6';
      default: return '#7f8c8d';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'revolut': return '🔄';
      case 'card': return '💳';
      default: return '❓';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <div className="login-form">
          <h2>🔐 Admin Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>🛠️ Admin Panel</h2>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-actions">
        <button 
          onClick={() => setShowCashForm(!showCashForm)}
          className="cash-payment-btn"
        >
          💵 Add Cash Payment
        </button>
        <button 
          onClick={() => setShowQueryForm(!showQueryForm)}
          className="query-btn"
        >
          🗄️ Database Query
        </button>
        {eventStatus !== 'COMPLETED' && (
          <button 
            onClick={() => setShowWinnerForm(!showWinnerForm)}
            className="winner-btn"
            style={{ background: '#e74c3c', color: 'white' }}
          >
            🏆 Set Winner & Complete Game
          </button>
        )}
        <button onClick={loadCredits} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {eventStatus === 'COMPLETED' && (
        <div style={{ 
          background: '#e8f5e8', 
          border: '2px solid #27ae60', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#27ae60' }}>🎉 Game Completed!</h3>
          <p style={{ margin: '0', color: '#2c3e50' }}>
            The game has been completed and the winner has been declared.
          </p>
        </div>
      )}

      {lastCreditId && (
        <div style={{ 
          background: '#e8f5e8', 
          border: '2px solid #27ae60', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#27ae60' }}>✅ Last Created Credit ID</h3>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            background: 'white',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid #27ae60'
          }}>
            <input 
              type="text" 
              value={lastCreditId}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '14px', 
                wordBreak: 'break-all',
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                cursor: 'text',
                padding: '2px'
              }}
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(lastCreditId);
                alert('Credit ID copied to clipboard!');
              }}
              style={{
                background: '#27ae60',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📋 Copy
            </button>
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#555' }}>
            Give this Credit ID to the customer so they can select their square.
          </p>
        </div>
      )}

      {showCashForm && (
        <div className="cash-form">
          <h3>💵 Record Cash Payment</h3>
          <form onSubmit={handleCashPayment}>
            <div className="form-row">
              <input
                type="text"
                placeholder="Customer Name"
                value={cashForm.customerName}
                onChange={(e) => setCashForm({...cashForm, customerName: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Customer Email (email OR phone required)"
                value={cashForm.customerEmail}
                onChange={(e) => setCashForm({...cashForm, customerEmail: e.target.value})}
              />
            </div>
            <div className="form-row">
              <input
                type="tel"
                placeholder="Customer Phone (email OR phone required)"
                value={cashForm.customerPhone}
                onChange={(e) => setCashForm({...cashForm, customerPhone: e.target.value})}
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={cashForm.notes}
                onChange={(e) => setCashForm({...cashForm, notes: e.target.value})}
              />
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowCashForm(false)}>Cancel</button>
              <button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Cash Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showWinnerForm && (
        <div className="winner-form" style={{
          background: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#856404', marginTop: 0 }}>🏆 Set Winner & Complete Game</h3>
          <p style={{ color: '#856404', marginBottom: '16px' }}>
            ⚠️ This action will complete the game and cannot be undone. Select the winning square from purchased squares.
          </p>
          
          <form onSubmit={handleSetWinner}>
            <div className="form-group">
              <label htmlFor="winnerSquare" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Select Winner Square:
              </label>
              <select
                id="winnerSquare"
                value={winnerSquare}
                onChange={(e) => setWinnerSquare(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px'
                }}
              >
                <option value="">Choose winning square...</option>
                {credits
                  .filter(credit => credit.selectedSquare && credit.status === 'USED')
                  .map(credit => (
                    <option key={credit.id} value={credit.selectedSquare!.position}>
                      {credit.selectedSquare!.position} - {credit.customerName} (#{credit.selectedSquare!.number})
                    </option>
                  ))
                }
              </select>
            </div>
            
            <div className="form-actions" style={{ marginTop: '16px' }}>
              <button type="button" onClick={() => setShowWinnerForm(false)} style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                marginRight: '8px'
              }}>
                Cancel
              </button>
              <button type="submit" disabled={loading || !winnerSquare} style={{
                background: winnerSquare ? '#e74c3c' : '#ccc',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                cursor: winnerSquare ? 'pointer' : 'not-allowed'
              }}>
                {loading ? 'Setting Winner...' : '🏆 Complete Game & Set Winner'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showQueryForm && (
        <div className="query-form">
          <h3>🗄️ Database Query</h3>
          <form onSubmit={executeQuery}>
            <div className="query-input">
              <textarea
                placeholder="Enter SELECT query (e.g., SELECT * FROM squares WHERE status = 'AVAILABLE')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setShowQueryForm(false)}>Cancel</button>
              <button type="submit" disabled={queryLoading || !query.trim()}>
                {queryLoading ? 'Executing...' : 'Execute Query'}
              </button>
            </div>
          </form>
          
          {queryResult && (
            <div className="query-result">
              <h4>Query Result ({queryResult.rowCount} rows)</h4>
              {queryResult.data && queryResult.data.length > 0 ? (
                <div className="result-table">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(queryResult.data[0]).map((key) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.data.map((row: any, index: number) => (
                        <tr key={index}>
                          {Object.values(row).map((value: any, cellIndex: number) => (
                            <td key={cellIndex}>{String(value)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No results found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="credits-list">
        <h3>💳 Payment Credits ({credits.length})</h3>
        {credits.length === 0 ? (
          <p>No payment credits found.</p>
        ) : (
          <div className="credits-table">
            {credits.map((credit) => (
              <div key={credit.id} className="credit-card">
                <div className="credit-header">
                  <span className="customer-name">{credit.customerName}</span>
                  <span className="payment-method">
                    {getPaymentMethodIcon(credit.paymentMethod)} {credit.paymentMethod}
                  </span>
                  <span 
                    className="status"
                    style={{ color: getStatusColor(credit.status) }}
                  >
                    {credit.status}
                  </span>
                </div>
                
                <div className="credit-details">
                  <div>📧 {credit.customerEmail}</div>
                  {credit.customerPhone && <div>📱 {credit.customerPhone}</div>}
                  <div>💰 €{credit.amount.toFixed(2)}</div>
                  <div>🕐 {new Date(credit.createdAt).toLocaleString()}</div>
                </div>

                {credit.selectedSquare && (
                  <div className="selected-square">
                    <strong>🎯 Square #{credit.selectedSquare.number}</strong>
                    <span>Position: {credit.selectedSquare.position}</span>
                    <span>Code: {credit.selectedSquare.confirmationCode}</span>
                  </div>
                )}

                {credit.status === 'CONFIRMED' && !credit.selectedSquare && (
                  <div className="awaiting-selection">
                    ⏳ Awaiting square selection
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};