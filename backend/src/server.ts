import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { setSocketInstance } from './services/socket';
import { config } from './config/env';
import { globalErrorHandler } from './middleware/errorHandler';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

const PORT = config.PORT;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173", "http://localhost:5174"],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Martinas Field API'
  });
});

// Import routes
import apiRoutes from './routes/index';

// API routes
app.use('/api', apiRoutes);

// Initialize socket service
setSocketInstance(io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 404 handler (must come before global error handler)
app.use((req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  (error as any).statusCode = 404;
  next(error);
});

// Global error handler (must be last)
app.use(globalErrorHandler);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io ready for connections`);
});

export { app, io, server };