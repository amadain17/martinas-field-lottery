import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { GAME_CONFIG } from '../config/gameConfig';

const router = Router();

// Helper function to generate position labels
const getPositionLabel = (gridX: number, gridY: number): string => {
  const columnLabel = GAME_CONFIG.labels.columns[gridX] || 'A';
  const rowLabel = GAME_CONFIG.labels.rows[gridY] || 1;
  return `${columnLabel}${rowLabel}`;
};

// Get all events
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: {
            squares: true,
            paymentCredits: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const eventsWithDetails = events.map(event => ({
      ...event,
      squarePrice: Number(event.squarePrice),
      totalPrizePool: Number(event.totalPrizePool),
      fixedPrizePerPoo: event.fixedPrizePerPoo ? Number(event.fixedPrizePerPoo) : null,
      availableSquares: GAME_CONFIG.grid.totalSquares - event._count.squares,
      totalSquares: GAME_CONFIG.grid.totalSquares
    }));

    res.json(eventsWithDetails);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get event by ID with squares
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        squares: {
          include: {
            squarePurchase: {
              select: {
                customerNameInitials: true,
                confirmationCode: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Add position labels to squares
    const squaresWithPosition = event.squares.map(square => ({
      ...square,
      position: getPositionLabel(square.gridX, square.gridY),
      ownerInitials: square.squarePurchase?.customerNameInitials || null
    }));

    const response = {
      ...event,
      squares: squaresWithPosition,
      squarePrice: Number(event.squarePrice),
      totalPrizePool: Number(event.totalPrizePool),
      fixedPrizePerPoo: event.fixedPrizePerPoo ? Number(event.fixedPrizePerPoo) : null
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ 
      error: 'Failed to fetch event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;