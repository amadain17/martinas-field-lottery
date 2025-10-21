import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { emitSquareSelected } from '../services/socket';

const router = Router();

interface SelectSquareBody {
  creditId: string;
  squareId: string;
}

// Select a square using payment credit
router.post('/select', async (req: Request, res: Response) => {
  try {
    const { creditId, squareId }: SelectSquareBody = req.body;

    if (!creditId || !squareId) {
      return res.status(400).json({ error: 'Missing creditId or squareId' });
    }

    // Start transaction to ensure data consistency
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
        throw new Error('Payment not confirmed');
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

      return { purchase, square, credit };
    });

    // Emit real-time update to all connected clients
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
      }
    });

  } catch (error) {
    console.error('Square selection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to select square';
    return res.status(400).json({ error: message });
  }
});

// Get available squares for an event
router.get('/event/:eventId/available', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const squares = await prisma.square.findMany({
      where: {
        eventId,
        status: 'AVAILABLE'
      },
      select: {
        id: true,
        squareNumber: true,
        gridX: true,
        gridY: true,
      },
      orderBy: { squareNumber: 'asc' }
    });

    return res.json({ squares });

  } catch (error) {
    console.error('Error fetching available squares:', error);
    return res.status(500).json({ error: 'Failed to fetch available squares' });
  }
});

// Get all squares for an event (for display)
router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const squares = await prisma.square.findMany({
      where: { eventId },
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

// Helper functions
function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3); // Max 3 initials
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