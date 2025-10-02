const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTrackingDemo() {
  console.log('\n🌱 CRIANDO DADOS DEMO DE RASTREAMENTO');
  console.log('═'.repeat(70));
  console.log('⚠️  ATENÇÃO: Dados simulados para demonstração do sistema\n');
  
  try {
    const orderId = 63689;
    
    // Verificar se pedido existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, trackingNumber: true }
    });
    
    if (!order) {
      console.log('❌ Pedido não encontrado');
      return;
    }
    
    console.log(`📦 Pedido #${orderId} - ${order.trackingNumber}\n`);
    
    // Limpar eventos existentes (se houver)
    await prisma.shipmentUpdate.deleteMany({
      where: { orderId }
    });
    
    // Criar eventos simulados (timeline realista dos Correios)
    const eventosDemo = [
      {
        orderId,
        status: 'PO',
        location: 'SÃO PAULO/SP',
        description: 'Objeto postado',
        timestamp: new Date('2025-09-15T16:30:00')
      },
      {
        orderId,
        status: 'RO',
        location: 'UNIDADE DE TRATAMENTO - SÃO PAULO/SP',
        description: 'Objeto recebido na unidade de exportação no país de origem',
        timestamp: new Date('2025-09-15T18:45:00')
      },
      {
        orderId,
        status: 'DO',
        location: 'UNIDADE DE TRATAMENTO - SÃO PAULO/SP',
        description: 'Objeto encaminhado',
        timestamp: new Date('2025-09-16T08:20:00')
      },
      {
        orderId,
        status: 'CD',
        location: 'CENTRO DE DISTRIBUIÇÃO - CAMPINAS/SP',
        description: 'Objeto em trânsito - por favor aguarde',
        timestamp: new Date('2025-09-16T14:10:00')
      },
      {
        orderId,
        status: 'CD',
        location: 'CENTRO DE DISTRIBUIÇÃO - RIBEIRÃO PRETO/SP',
        description: 'Objeto em trânsito - por favor aguarde',
        timestamp: new Date('2025-09-17T09:35:00')
      },
      {
        orderId,
        status: 'OEC',
        location: 'UNIDADE DE DISTRIBUIÇÃO - RIBEIRÃO PRETO/SP',
        description: 'Objeto saiu para entrega ao destinatário',
        timestamp: new Date('2025-09-18T07:15:00')
      }
    ];
    
    // Inserir eventos
    for (const evento of eventosDemo) {
      await prisma.shipmentUpdate.create({
        data: evento
      });
    }
    
    console.log(`✅ ${eventosDemo.length} eventos criados com sucesso!\n`);
    
    // Atualizar dados do pedido
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'OUT_FOR_DELIVERY',
        currentLocation: 'UNIDADE DE DISTRIBUIÇÃO - RIBEIRÃO PRETO/SP',
        shippingCarrier: 'Correios',
        departureDate: new Date('2025-09-15'),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Dados do pedido atualizados:\n');
    console.log('   Status: OUT_FOR_DELIVERY (Saiu para entrega)');
    console.log('   Localização: UNIDADE DE DISTRIBUIÇÃO - RIBEIRÃO PRETO/SP');
    console.log('   Transportadora: Correios');
    console.log('   Data de envio: 15/09/2025\n');
    
    // Exibir timeline
    console.log('📋 TIMELINE DE RASTREAMENTO:\n');
    eventosDemo.forEach((evento, index) => {
      console.log(`${index + 1}. ${evento.description}`);
      console.log(`   📅 ${evento.timestamp.toLocaleString('pt-BR')}`);
      console.log(`   📍 ${evento.location}`);
      console.log(`   🏷️  ${evento.status}`);
      console.log('');
    });
    
    console.log('═'.repeat(70));
    console.log('✅ DADOS DEMO CRIADOS COM SUCESSO!');
    console.log('═'.repeat(70));
    console.log('\n💡 Agora você pode:');
    console.log('   1. Acessar /meus-pedidos/63689 no frontend');
    console.log('   2. Ver a timeline de rastreamento completa');
    console.log('   3. Testar o botão "Atualizar Rastreamento"');
    console.log('\n⚠️  Para usar dados reais dos Correios:');
    console.log('   - Aguarde a postagem real do pacote');
    console.log('   - Execute o rastreamento automático');
    console.log('   - Os dados demo serão substituídos pelos dados reais\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTrackingDemo();

