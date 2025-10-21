import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Simple admin health check for deployment
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: 'healthy', 
      service: 'admin',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      service: 'admin',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Simple events list
router.get('/events', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        squarePrice: true,
        createdAt: true,
        _count: {
          select: {
            squares: true,
            paymentCredits: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;