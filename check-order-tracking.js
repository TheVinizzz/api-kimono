const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkOrderTracking() {
  console.log('\n🔍 VERIFICANDO DADOS DE RASTREAMENTO DO PEDIDO #63689');
  console.log('═'.repeat(70));
  
  try {
    // Buscar pedido com todos os dados de rastreamento
    const order = await prisma.order.findUnique({
      where: { id: 63689 },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true
          }
        },
        trackingUpdates: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });
    
    if (!order) {
      console.log('❌ Pedido não encontrado');
      return;
    }
    
    console.log('\n📦 DADOS DO PEDIDO:');
    console.log('─'.repeat(70));
    console.log('ID:', order.id);
    console.log('Cliente:', order.customerName);
    console.log('Email:', order.customerEmail);
    console.log('Status:', order.status);
    console.log('Código de Rastreio:', order.trackingNumber);
    console.log('Transportadora:', order.shippingCarrier || 'Não definida');
    console.log('Localização Atual:', order.currentLocation || 'Não disponível');
    console.log('Data de Envio:', order.departureDate || 'Não disponível');
    console.log('Método de Envio:', order.shippingMethod);
    console.log('Data do Pedido:', order.createdAt.toLocaleString('pt-BR'));
    console.log('Última Atualização:', order.updatedAt.toLocaleString('pt-BR'));
    
    console.log('\n📋 HISTÓRICO DE RASTREAMENTO:');
    console.log('─'.repeat(70));
    
    if (order.trackingUpdates && order.trackingUpdates.length > 0) {
      console.log(`\nTotal de eventos: ${order.trackingUpdates.length}\n`);
      
      order.trackingUpdates.forEach((update, index) => {
        console.log(`${index + 1}. ${update.description}`);
        console.log(`   Data/Hora: ${update.timestamp.toLocaleString('pt-BR')}`);
        console.log(`   Status: ${update.status}`);
        console.log(`   Local: ${update.location || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhum evento de rastreamento encontrado no banco de dados');
      console.log('\n💡 AÇÕES NECESSÁRIAS:');
      console.log('   1. O sistema precisa consultar a API dos Correios');
      console.log('   2. Execute o rastreamento automático ou manual');
      console.log('   3. Os dados dos Correios serão salvos na tabela ShipmentUpdate');
    }
    
    console.log('\n🔄 COMO OBTER DADOS DOS CORREIOS:');
    console.log('─'.repeat(70));
    console.log('\n1. Rastreamento Manual:');
    console.log(`   curl -X GET "http://localhost:4000/api/correios/rastreamento/${order.trackingNumber}"`);
    console.log('\n2. Rastreamento Automático:');
    console.log('   Inicie o serviço automático no backend');
    console.log('\n3. Via Painel Admin:');
    console.log('   Acesse o painel admin e force atualização de rastreamento');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrderTracking();

