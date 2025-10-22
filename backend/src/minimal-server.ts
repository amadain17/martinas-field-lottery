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
  res.json({
    id: 'demo-event-1',
    title: 'Demo Horse Poo Lottery',
    status: 'active',
    squarePrice: 10.00,
    totalSquares: 144
  });
});

app.get('/api/events/demo-event-1/squares', (req, res) => {
  // Return empty squares array for now
  res.json([]);
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