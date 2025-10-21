import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { GAME_CONFIG, CALCULATED_VALUES } from '../../../config/gameConfig';

const router = Router();

// Get all events
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        squarePrice: true,
        gridCols: true,
        gridRows: true,
        createdAt: true,
        _count: {
          select: {
            squares: {
              where: { status: 'TAKEN' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedEvents = events.map(event => ({
      ...event,
      squarePrice: Number(event.squarePrice),
      totalSquares: event.gridCols * event.gridRows,
      soldSquares: event._count?.squares || 0,
      prizePool: CALCULATED_VALUES.totalPrizePool,
      prizeBreakdown: CALCULATED_VALUES.prizeBreakdown,
    }));

    return res.json({ events: formattedEvents });

  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event with details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            squares: {
              where: { status: 'TAKEN' }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // If event is completed and has a winner, fetch winner details
    let winnerSquare = null;
    if (event.status === 'COMPLETED' && event.winnerSquareId) {
      const winner = await prisma.square.findUnique({
        where: { id: event.winnerSquareId },
        include: {
          squarePurchase: true
        }
      });
      
      if (winner && winner.squarePurchase) {
        winnerSquare = {
          position: winner.position,
          squareNumber: winner.squareNumber,
          customerName: winner.squarePurchase.customerFullName,
          confirmationCode: winner.squarePurchase.confirmationCode
        };
      }
    }

    const formattedEvent = {
      ...event,
      squarePrice: Number(event.squarePrice),
      totalSquares: event.gridCols * event.gridRows,
      soldSquares: event._count?.squares || 0,
      prizePool: CALCULATED_VALUES.totalPrizePool,
      prizeBreakdown: CALCULATED_VALUES.prizeBreakdown,
      winnerSquare,
      squares: undefined // Don't include squares array in response
    };

    return res.json({ event: formattedEvent });

  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Get event squares
router.get('/:id/squares', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const squares = await prisma.square.findMany({
      where: { eventId: id },
      include: {
        squarePurchase: {
          select: {
            customerNameInitials: true,
            confirmationCode: true,
          }
        }
      },
      orderBy: { squareNumber: 'asc' }
    });

    const formattedSquares = squares.map(square => ({
      id: square.id,
      squareNumber: square.squareNumber,
      gridX: square.gridX,
      gridY: square.gridY,
      position: square.position,
      status: square.status,
      ownerInitials: square.squarePurchase?.customerNameInitials || null,
      selectedAt: square.selectedAt,
    }));

    return res.json({ squares: formattedSquares });

  } catch (error) {
    console.error('Error fetching squares:', error);
    return res.status(500).json({ error: 'Failed to fetch squares' });
  }
});

// Create new event (admin only - simplified for now)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      teamAName,
      teamBName
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Missing required field: name'
      });
    }

    // Use centralized configuration
    const { cols: gridCols, rows: gridRows } = CALCULATED_VALUES.gridDimensions;
    const squarePrice = GAME_CONFIG.pricing.squarePrice;

    const event = await prisma.event.create({
      data: {
        name,
        description,
        squarePrice: squarePrice,
        gridCols: gridCols,
        gridRows: gridRows,
        teamAName,
        teamBName,
        status: 'DRAFT',
      }
    });

    // Generate squares for the configured grid
    const squares = [];
    let squareNumber = 1;

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const position = `${GAME_CONFIG.labels.columns[col]}${GAME_CONFIG.labels.rows[row]}`;
        squares.push({
          eventId: event.id,
          gridX: col,
          gridY: row,
          position: position,
          squareNumber: squareNumber++,
          status: 'AVAILABLE' as const,
        });
      }
    }

    await prisma.square.createMany({
      data: squares
    });

    return res.status(201).json({
      event: {
        ...event,
        squarePrice: Number(event.squarePrice),
        totalSquares: GAME_CONFIG.grid.totalSquares,
        prizePool: CALCULATED_VALUES.totalPrizePool,
        prizeBreakdown: CALCULATED_VALUES.prizeBreakdown,
      }
    });

  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});


export default router;