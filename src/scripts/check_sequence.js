const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSequence() {
  try {
    // First check the last order ID
    const lastOrder = await prisma.order.findFirst({
      orderBy: {
        id: 'desc'
      }
    });
    
    console.log('Last order ID:', lastOrder ? lastOrder.id : 'No orders found');
    
    // Execute a raw query to check the next sequence value
    const result = await prisma.$queryRaw`SELECT last_value, is_called FROM "Order_id_seq"`;
    console.log('Current Order sequence value:', {
      last_value: Number(result[0].last_value),
      is_called: result[0].is_called
    });
    
    // The next ID will be last_value + 1 if is_called is true, or last_value if is_called is false
    const nextId = result[0].is_called ? Number(result[0].last_value) + 1 : Number(result[0].last_value);
    console.log('Next Order ID will be:', nextId);
  } catch (error) {
    console.error('Error checking sequence:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSequence(); 