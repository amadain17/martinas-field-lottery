import { prisma } from './prisma';
import { GAME_CONFIG, CALCULATED_VALUES } from '../../config/gameConfig';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create demo event using centralized configuration
    const { cols: gridCols, rows: gridRows } = CALCULATED_VALUES.gridDimensions;
    const event = await prisma.event.upsert({
      where: { id: 'demo-event-1' },
      update: {
        squarePrice: GAME_CONFIG.pricing.squarePrice,
        gridCols: gridCols,
        gridRows: gridRows,
      },
      create: {
        id: 'demo-event-1',
        name: "Horse Poo Bingo",
        fieldCoordinates: "{}",  // Empty GeoJSON for now
        squarePrice: GAME_CONFIG.pricing.squarePrice,
        gridCols: gridCols,
        gridRows: gridRows,
        status: 'SELLING',
        totalPrizePool: CALCULATED_VALUES.totalPrizePool,
      }
    });

    console.log(`📅 Created event: ${event.name}`);

    // Check if squares need to be regenerated (different count means different grid size)
    const existingSquares = await prisma.square.count({
      where: { eventId: event.id }
    });

    const expectedSquares = GAME_CONFIG.grid.totalSquares;

    if (existingSquares !== expectedSquares) {
      console.log(`🔄 Grid size changed: found ${existingSquares} squares, expected ${expectedSquares}`);
      
      // Delete existing squares
      await prisma.square.deleteMany({
        where: { eventId: event.id }
      });
      console.log(`🗑️ Deleted ${existingSquares} existing squares`);
      // Generate squares using centralized configuration
      const squares = [];
      let squareNumber = 1;

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const position = `${GAME_CONFIG.labels.columns[col]}${GAME_CONFIG.labels.rows[row]}`;
          squares.push({
            eventId: event.id,
            gridX: col,
            gridY: row,
            squareNumber: squareNumber++,
            polygonCoordinates: "{}", // Empty GeoJSON for now
            status: 'AVAILABLE' as const,
          });
        }
      }

      await prisma.square.createMany({
        data: squares
      });

      console.log(`🔲 Created ${squares.length} squares`);

      // Create some demo sold squares
      const demoSales = [
        { gridX: 0, gridY: 0, customerName: 'John Doe', customerEmail: 'john@example.com' }, // A1
        { gridX: 2, gridY: 2, customerName: 'Alice Brown', customerEmail: 'alice@example.com' }, // C3  
        { gridX: 5, gridY: 4, customerName: 'Charlie Davis', customerEmail: 'charlie@example.com' }, // F5
      ];

      for (const sale of demoSales) {
        // Find the square
        const square = await prisma.square.findFirst({
          where: {
            eventId: event.id,
            gridX: sale.gridX,
            gridY: sale.gridY
          }
        });

        if (square) {
          // Create a demo payment credit
          const position = `${GAME_CONFIG.labels.columns[sale.gridX]}${GAME_CONFIG.labels.rows[sale.gridY]}`;
          const credit = await prisma.paymentCredit.create({
            data: {
              eventId: event.id,
              customerName: sale.customerName,
              customerEmail: sale.customerEmail,
              paymentIntentId: `demo_payment_${position}`,
              amount: 10.00,
              status: 'USED',
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            }
          });

          // Create the purchase
          await prisma.squarePurchase.create({
            data: {
              squareId: square.id,
              creditId: credit.id,
              customerNameInitials: getInitials(sale.customerName),
              customerFullName: sale.customerName,
              confirmationCode: generateConfirmationCode(),
            }
          });

          // Update square status
          await prisma.square.update({
            where: { id: square.id },
            data: {
              status: 'TAKEN',
              ownerId: sale.customerEmail,
              selectedAt: new Date(),
            }
          });

          console.log(`✅ Created demo sale for square ${position} (${sale.customerName})`);
        }
      }
    } else {
      console.log(`🔲 Squares already exist (${existingSquares} squares, expected ${expectedSquares})`);
    }

    console.log('✅ Database seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

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

// Run if called directly
if (require.main === module) {
  seed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default seed;