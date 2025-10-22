import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Middleware - Allow Shopify domain
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'https://rathdrum-u16-girls.myshopify.com'
  ],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'martinas-field-backend',
    version: '1.0.0'
  });
});

// Root endpoint (Railway health check)
app.get('/', (req, res) => {
  console.log('Health check requested on / endpoint');
  res.status(200).json({ 
    message: 'Martinas Field Lottery API',
    status: 'healthy',
    service: 'martinas-field-backend',
    timestamp: new Date().toISOString(),
    endpoints: ['/', '/api/health', '/api/test']
  });
});

// Basic test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Mock lottery endpoints for testing
app.get('/api/events/demo-event-1', (req, res) => {
  console.log('📡 Event API called');
  const eventData = {
    id: 'demo-event-1',
    title: 'Demo Horse Poo Lottery',
    status: 'active',
    squarePrice: 10.00,
    totalSquares: 144,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    fieldCenter: [-6.2297778, 52.9416389],
    gridDimensions: { cols: 12, rows: 12 }
  };
  console.log('📤 Sending event data:', eventData);
  res.status(200).json(eventData);
});

app.get('/api/events/demo-event-1/squares', (req, res) => {
  console.log('📡 Squares API called');
  // Return empty squares array with proper structure
  const squares = [];
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 12; col++) {
      squares.push({
        id: `square-${row}-${col}`,
        eventId: 'demo-event-1',
        gridX: col,
        gridY: row,
        position: `${String.fromCharCode(65 + col)}${row + 1}`,
        isReserved: false,
        ownerId: null,
        ownerName: null,
        paymentCreditId: null,
        coordinates: [
          -6.2297778 + (col - 6) * 0.000014,
          52.9416389 + (row - 6) * 0.000009
        ]
      });
    }
  }
  console.log(`📤 Sending ${squares.length} squares`);
  res.status(200).json(squares);
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server listening on ${HOST}:${PORT}`);
  console.log(`🌐 Health check: http://${HOST}:${PORT}/api/health`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 Service ready for Railway health checks`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});