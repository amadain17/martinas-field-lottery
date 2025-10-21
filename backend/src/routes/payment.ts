import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { RevolutService, CreateRevolutPaymentRequest } from '../services/revolut';
import { validateBody, validateParams, validatePaymentIntent, commonSchemas } from '../middleware/validation';
import { asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { verifyRevolutWebhook, paymentRateLimit } from '../middleware/webhookSecurity';

const router = Router();

interface CreatePaymentIntentBody {
  eventId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

// Note: Stripe payment intent creation removed - Shop Pay handles card payments

// Get payment credit status
router.get('/credit/:creditId', async (req: Request, res: Response) => {
  try {
    const { creditId } = req.params;

    const credit = await prisma.paymentCredit.findUnique({
      where: { id: creditId },
      include: {
        event: {
          select: { name: true, squarePrice: true }
        }
      }
    });

    if (!credit) {
      return res.status(404).json({ error: 'Payment credit not found' });
    }

    return res.json({
      id: credit.id,
      status: credit.status,
      amount: Number(credit.amount),
      expiresAt: credit.expiresAt.toISOString(),
      customerName: credit.customerName,
      event: credit.event,
      canSelectSquare: credit.status === 'CONFIRMED' && new Date() < credit.expiresAt,
    });

  } catch (error) {
    console.error('Error fetching payment credit:', error);
    return res.status(500).json({ error: 'Failed to fetch payment credit' });
  }
});

// Create Revolut payment (Ireland primary method)
router.post('/revolut/create', 
  validatePaymentIntent,
  async (req: Request, res: Response) => {
  try {
    const { eventId, customerName, customerEmail, customerPhone }: CreatePaymentIntentBody = req.body;

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

    // Create Revolut payment
    const revolutResponse = await RevolutService.createPayment({
      eventId,
      customerName,
      customerEmail,
      customerPhone,
      amount: Number(event.squarePrice),
    });

    // Create payment credit record
    const paymentCredit = await prisma.paymentCredit.create({
      data: {
        eventId,
        customerName,
        customerEmail,
        customerPhone,
        paymentIntentId: revolutResponse.paymentId,
        amount: event.squarePrice,
        status: 'PENDING',
        expiresAt: new Date(revolutResponse.expiresAt),
      },
    });

    return res.json({
      redirectUrl: revolutResponse.redirectUrl,
      creditId: paymentCredit.id,
      amount: Number(event.squarePrice),
      expiresAt: revolutResponse.expiresAt,
      paymentMethod: 'revolut',
    });

  } catch (error) {
    console.error('Revolut payment creation error:', error);
    return res.status(500).json({ error: 'Failed to create Revolut payment' });
  }
});

// Revolut webhook handler
router.post('/revolut/webhook', async (req: Request, res: Response) => {
  try {
    const { event_type, data } = req.body;

    console.log('Revolut webhook received:', { event_type, orderId: data?.id });

    if (event_type === 'ORDER_COMPLETED') {
      // Update payment credit status
      await prisma.paymentCredit.updateMany({
        where: { paymentIntentId: data.id },
        data: { status: 'CONFIRMED' },
      });

      console.log(`Revolut payment confirmed for order: ${data.id}`);
    } else if (event_type === 'ORDER_FAILED') {
      // Update payment credit status
      await prisma.paymentCredit.updateMany({
        where: { paymentIntentId: data.id },
        data: { status: 'REFUNDED' },
      });

      console.log(`Revolut payment failed for order: ${data.id}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Revolut webhook error:', error);
    res.status(400).json({ error: 'Webhook handling failed' });
  }
});

// Mock Revolut payment success page (for development)
router.get('/revolut/mock-success/:creditId', async (req: Request, res: Response) => {
  try {
    const { creditId } = req.params;
    
    // Update payment credit to confirmed
    await prisma.paymentCredit.update({
      where: { id: creditId },
      data: { status: 'CONFIRMED' },
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?creditId=${creditId}&method=revolut`);
  } catch (error) {
    console.error('Mock payment success error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-failed`);
  }
});

// Mock Revolut payment confirmation API (for development - returns JSON)
router.post('/revolut/confirm/:creditId', async (req: Request, res: Response) => {
  try {
    const { creditId } = req.params;
    
    // Update payment credit to confirmed
    const updatedCredit = await prisma.paymentCredit.update({
      where: { id: creditId },
      data: { status: 'CONFIRMED' },
    });

    res.json({
      success: true,
      creditId: updatedCredit.id,
      status: 'CONFIRMED',
      message: 'Payment confirmed successfully'
    });
  } catch (error) {
    console.error('Mock payment confirmation error:', error);
    res.status(400).json({
      success: false,
      error: 'Payment confirmation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Shopify webhook handler for order payments
router.post('/shopify/webhook', 
  asyncHandler(async (req: Request, res: Response) => {
    const order = req.body;
    
    console.log('Shopify webhook received:', { 
      orderId: order.id, 
      email: order.email,
      total: order.total_price,
      status: order.financial_status 
    });

    // Only process paid orders
    if (order.financial_status === 'paid') {
      // Extract customer info
      const customerName = order.billing_address?.name || 
                          `${order.billing_address?.first_name || ''} ${order.billing_address?.last_name || ''}`.trim() ||
                          order.customer?.display_name || 
                          'Anonymous';
      
      const customerEmail = order.email || order.customer?.email;
      const customerPhone = order.billing_address?.phone || order.customer?.phone;

      // Check if this is a lottery square purchase (product name contains "Horse Poo Lottery")
      const isLotteryPurchase = order.line_items?.some((item: any) => 
        item.title?.toLowerCase().includes('horse poo lottery') ||
        item.title?.toLowerCase().includes('lottery square')
      );

      if (isLotteryPurchase) {
        // Find the active lottery event
        const activeEvent = await prisma.event.findFirst({
          where: { status: 'SELLING' },
          orderBy: { createdAt: 'desc' }
        });

        if (activeEvent) {
          // Create payment credit for each lottery square purchased
          const lotteryItems = order.line_items?.filter((item: any) => 
            item.title?.toLowerCase().includes('horse poo lottery') ||
            item.title?.toLowerCase().includes('lottery square')
          ) || [];

          for (const item of lotteryItems) {
            for (let i = 0; i < item.quantity; i++) {
              const paymentCredit = await prisma.paymentCredit.create({
                data: {
                  eventId: activeEvent.id,
                  customerName,
                  customerEmail,
                  customerPhone,
                  paymentIntentId: `shopify_${order.id}_${item.id}_${i}`,
                  amount: activeEvent.squarePrice,
                  status: 'CONFIRMED', // Shopify already confirmed payment
                  expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes to select square
                },
              });

              console.log(`Payment credit created for Shopify order ${order.id}: ${paymentCredit.id}`);
            }
          }
        }
      }
    }

    res.json({ received: true });
  })
);

// Check if Shopify order already has payment credit
router.get('/shopify/check-order/:orderId', 
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    
    const paymentCredit = await prisma.paymentCredit.findFirst({
      where: { 
        paymentIntentId: { 
          startsWith: `shopify_${orderId}` 
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!paymentCredit) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      creditId: paymentCredit.id,
      amount: Number(paymentCredit.amount),
      status: paymentCredit.status,
      expiresAt: paymentCredit.expiresAt.toISOString(),
    });
  })
);

// Create payment credit from Shopify order (for direct integration)
router.post('/shopify/create-credit', 
  validateBody({
    shopifyOrderId: { required: true, type: 'string' },
    eventId: { required: true, type: 'string' },
    customerName: { required: true, type: 'string' },
    customerEmail: { required: false, type: 'string' },
    customerPhone: { required: false, type: 'string' },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { shopifyOrderId, eventId, customerName, customerEmail, customerPhone } = req.body;

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.status !== 'SELLING') {
      throw new ValidationError('Event is not currently selling squares');
    }

    // Create payment credit record
    const paymentCredit = await prisma.paymentCredit.create({
      data: {
        eventId,
        customerName,
        customerEmail,
        customerPhone,
        paymentIntentId: `shopify_${shopifyOrderId}`,
        amount: event.squarePrice,
        status: 'CONFIRMED', // Shopify payment already processed
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes to select
      },
    });

    res.json({
      creditId: paymentCredit.id,
      amount: Number(event.squarePrice),
      expiresAt: paymentCredit.expiresAt.toISOString(),
      status: 'CONFIRMED',
    });
  })
);

// Get payment credit by ID (for cash payments)
router.get('/credit/:creditId', async (req: Request, res: Response) => {
  try {
    const { creditId } = req.params;
    
    const paymentCredit = await prisma.paymentCredit.findUnique({
      where: { id: creditId }
    });
    
    if (!paymentCredit) {
      return res.status(404).json({ error: 'Payment credit not found' });
    }
    
    // Check if credit has expired
    const isExpired = new Date() > paymentCredit.expiresAt;
    if (isExpired && paymentCredit.status === 'CONFIRMED') {
      // Update to expired status
      await prisma.paymentCredit.update({
        where: { id: creditId },
        data: { status: 'EXPIRED' }
      });
      
      return res.status(400).json({ 
        error: 'Payment credit has expired',
        status: 'EXPIRED',
        expiresAt: paymentCredit.expiresAt
      });
    }
    
    return res.json({
      id: paymentCredit.id,
      customerName: paymentCredit.customerName,
      customerEmail: paymentCredit.customerEmail,
      amount: Number(paymentCredit.amount),
      status: paymentCredit.status,
      createdAt: paymentCredit.createdAt,
      expiresAt: paymentCredit.expiresAt,
      paymentMethod: paymentCredit.paymentIntentId.startsWith('cash_') ? 'cash' : 'card'
    });
    
  } catch (error) {
    console.error('Get payment credit error:', error);
    return res.status(500).json({ error: 'Failed to get payment credit' });
  }
});

export default router;