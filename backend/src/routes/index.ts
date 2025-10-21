import { Router } from 'express';
import eventsRouter from './events-simple';
import paymentRouter from './payment';
import squaresRouter from './squares';
import adminRouter from './admin-simple';

const router = Router();

// Health check endpoint for deployment
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'martinas-field-backend'
  });
});

// Mount route modules
router.use('/events', eventsRouter);
router.use('/payment', paymentRouter);
router.use('/squares', squaresRouter);
router.use('/admin', adminRouter);

export default router;