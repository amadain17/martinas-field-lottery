import { Router, Request, Response, NextFunction } from 'express';
import { AdminUser } from '../types/auth';
import { prisma } from '../prisma';
import { emitSquareSelected } from '../services/socket';
import { validatePaymentIntent } from '../middleware/validation';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { GAME_CONFIG } from '../../../config/gameConfig';

// Helper function to generate position labels
const getPositionLabel = (gridX: number, gridY: number): string => {
  const columnLabel = GAME_CONFIG.labels.columns[gridX] || 'A';
  const rowLabel = GAME_CONFIG.labels.rows[gridY] || 1;
  return `${columnLabel}${rowLabel}`;
};

const router = Router();

// Admin middleware
const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId }
    });

    if (!admin) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { username }
    });

    if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { adminId: admin.id },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// Create cash payment credit (admin only)
router.post('/cash-payment', authenticateAdmin, validatePaymentIntent, async (req: Request, res: Response) => {
  try {
    const { eventId, customerName, customerEmail, customerPhone, notes } = req.body;

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'SELLING') {
      return res.status(400).json({ error: 'Event is not currently selling squares' });
    }

    // Generate unique payment intent ID for cash payments
    const generateUniqueCashId = async (): Promise<string> => {
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        // More robust ID generation: timestamp + random + counter for uniqueness
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 12);
        const counter = attempts.toString(36);
        const cashId = `cash_${timestamp}_${random}_${counter}`;
        
        // Check if this ID already exists
        const existing = await prisma.paymentCredit.findUnique({
          where: { paymentIntentId: cashId }
        });
        
        if (!existing) {
          return cashId;
        }
        
        attempts++;
        // Small delay to ensure timestamp changes
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      throw new Error('Failed to generate unique payment intent ID after multiple attempts');
    };

    const uniquePaymentIntentId = await generateUniqueCashId();

    // Create payment credit with cash method
    const paymentCredit = await prisma.paymentCredit.create({
      data: {
        eventId,
        customerName,
        customerEmail,
        customerPhone,
        paymentIntentId: uniquePaymentIntentId,
        amount: event.squarePrice,
        status: 'CONFIRMED', // Cash is pre-confirmed
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes for cash selection
      },
    });

    // Log admin action
    await prisma.eventTimeline.create({
      data: {
        eventId,
        eventType: 'PRIZE_CALCULATED', // Reusing enum, could add CASH_PAYMENT
        details: JSON.stringify({
          action: 'cash_payment_created',
          adminId: req.admin!.id,
          creditId: paymentCredit.id,
          customerName,
          notes,
        }),
      },
    });

    return res.json({
      creditId: paymentCredit.id,
      customerName: paymentCredit.customerName,
      amount: Number(paymentCredit.amount),
      expiresAt: paymentCredit.expiresAt.toISOString(),
      paymentMethod: 'cash',
    });

  } catch (error) {
    console.error('Cash payment creation error:', error);
    return res.status(500).json({ error: 'Failed to create cash payment credit' });
  }
});

// Admin square selection (for cash payments)
router.post('/select-square', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { creditId, squareId, notes } = req.body;

    if (!creditId || !squareId) {
      return res.status(400).json({ error: 'Missing creditId or squareId' });
    }

    // Use transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get payment credit
      const credit = await tx.paymentCredit.findUnique({
        where: { id: creditId },
        include: { event: true }
      });

      if (!credit) {
        throw new Error('Payment credit not found');
      }

      if (credit.status !== 'CONFIRMED') {
        throw new Error('Payment credit not confirmed');
      }

      if (new Date() > credit.expiresAt) {
        throw new Error('Payment credit has expired');
      }

      // Check if credit is already used
      const existingPurchase = await tx.squarePurchase.findUnique({
        where: { creditId }
      });

      if (existingPurchase) {
        throw new Error('Payment credit already used');
      }

      // Get the square
      const square = await tx.square.findUnique({
        where: { id: squareId }
      });

      if (!square) {
        throw new Error('Square not found');
      }

      if (square.eventId !== credit.eventId) {
        throw new Error('Square does not belong to the event');
      }

      if (square.status !== 'AVAILABLE') {
        throw new Error('Square is not available');
      }

      // Create square purchase
      const purchase = await tx.squarePurchase.create({
        data: {
          squareId,
          creditId,
          customerNameInitials: getInitials(credit.customerName),
          customerFullName: credit.customerName,
          confirmationCode: generateConfirmationCode(),
        }
      });

      // Update square status
      await tx.square.update({
        where: { id: squareId },
        data: {
          status: 'TAKEN',
          ownerId: credit.customerEmail,
          selectedAt: new Date(),
        }
      });

      // Update credit status
      await tx.paymentCredit.update({
        where: { id: creditId },
        data: { status: 'USED' }
      });

      // Log admin action
      await tx.eventTimeline.create({
        data: {
          eventId: credit.eventId,
          eventType: 'PRIZE_CALCULATED',
          details: JSON.stringify({
            action: 'admin_square_selection',
            adminId: req.admin!.id,
            squareId,
            squareNumber: square.squareNumber,
            customerName: credit.customerName,
            paymentMethod: credit.paymentIntentId.startsWith('cash_') ? 'cash' : 'card',
            notes,
          }),
        },
      });

      return { purchase, square, credit };
    });

    // Emit real-time update
    emitSquareSelected({
      eventId: result.credit.eventId,
      squareId: result.square.id,
      squareNumber: result.square.squareNumber,
      ownerInitials: result.purchase.customerNameInitials,
      selectedAt: result.square.selectedAt?.toISOString() || new Date().toISOString(),
    });

    return res.json({
      success: true,
      confirmationCode: result.purchase.confirmationCode,
      square: {
        id: result.square.id,
        squareNumber: result.square.squareNumber,
        gridX: result.square.gridX,
        gridY: result.square.gridY,
      },
      paymentMethod: 'cash',
    });

  } catch (error) {
    console.error('Admin square selection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to select square';
    return res.status(400).json({ error: message });
  }
});

// Get all payment credits for an event (admin only)
router.get('/event/:eventId/credits', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const credits = await prisma.paymentCredit.findMany({
      where: { eventId },
      include: {
        squarePurchase: {
          include: {
            square: {
              select: {
                squareNumber: true,
                gridX: true,
                gridY: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedCredits = credits.map(credit => ({
      id: credit.id,
      customerName: credit.customerName,
      customerEmail: credit.customerEmail,
      customerPhone: credit.customerPhone,
      amount: Number(credit.amount),
      status: credit.status,
      paymentMethod: credit.paymentIntentId.startsWith('cash_') ? 'cash' : 'card',
      selectedSquare: credit.squarePurchase ? {
        number: credit.squarePurchase.square.squareNumber,
        position: credit.squarePurchase.square.position,
        confirmationCode: credit.squarePurchase.confirmationCode,
      } : null,
      createdAt: credit.createdAt,
      expiresAt: credit.expiresAt,
    }));

    return res.json({ credits: formattedCredits });

  } catch (error) {
    console.error('Error fetching payment credits:', error);
    return res.status(500).json({ error: 'Failed to fetch payment credits' });
  }
});

// Execute database query (admin only)
router.post('/query', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    // Security: Only allow SELECT queries for safety
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed for security' });
    }

    // Execute the query using Prisma's raw query functionality
    const result = await prisma.$queryRawUnsafe(query);

    return res.json({ 
      success: true, 
      data: result,
      rowCount: Array.isArray(result) ? result.length : 1
    });

  } catch (error) {
    console.error('Database query error:', error);
    return res.status(500).json({ 
      error: 'Query execution failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Set winner and complete game (admin only)
router.post('/event/:eventId/set-winner', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { squareId } = req.body;

    if (!squareId) {
      return res.status(400).json({ error: 'Square ID is required' });
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Verify the square exists and belongs to this event
      const square = await tx.square.findUnique({
        where: { id: squareId },
        include: {
          squarePurchase: {
            include: {
              paymentCredit: true
            }
          }
        }
      });

      if (!square) {
        throw new Error('Square not found');
      }

      if (square.eventId !== eventId) {
        throw new Error('Square does not belong to this event');
      }

      if (square.status !== 'TAKEN') {
        throw new Error('Square must be purchased to be selected as winner');
      }

      // Update event with winner and mark as completed
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: {
          winnerSquareId: squareId,
          status: 'COMPLETED'
        }
      });

      // Log the completion in timeline
      await tx.eventTimeline.create({
        data: {
          eventId,
          eventType: 'EVENT_COMPLETED',
          details: JSON.stringify({
            action: 'game_completed',
            adminId: req.admin!.id,
            winnerSquareId: squareId,
            winnerSquareNumber: square.squareNumber,
            winnerPosition: square.position,
            winnerName: square.squarePurchase?.customerFullName || 'Unknown',
            completedAt: new Date().toISOString(),
          }),
        },
      });

      return { event: updatedEvent, square, purchase: square.squarePurchase };
    });

    return res.json({
      success: true,
      event: {
        id: result.event.id,
        status: result.event.status,
        winnerSquareId: result.event.winnerSquareId
      },
      winner: {
        squareId: result.square.id,
        squareNumber: result.square.squareNumber,
        position: result.square.position,
        customerName: result.purchase?.customerFullName || 'Unknown',
        customerEmail: result.purchase?.paymentCredit?.customerEmail || null,
        customerPhone: result.purchase?.paymentCredit?.customerPhone || null,
        confirmationCode: result.purchase?.confirmationCode
      }
    });

  } catch (error) {
    console.error('Set winner error:', error);
    const message = error instanceof Error ? error.message : 'Failed to set winner';
    return res.status(400).json({ error: message });
  }
});

// Test socket emission endpoint (for debugging)
router.post('/test-socket', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🧪 Manual socket test triggered');
    emitSquareSelected({
      eventId: 'demo-event-1',
      squareId: 'test-square-id',
      squareNumber: 999,
      ownerInitials: 'TEST',
      selectedAt: new Date().toISOString(),
    });
    
    return res.json({ 
      success: true, 
      message: 'Test socket event emitted' 
    });
  } catch (error) {
    console.error('Test socket error:', error);
    return res.status(500).json({ error: 'Failed to emit test socket event' });
  }
});

// Helper functions
function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3);
}

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default router;