const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateWithRealCorreiosData() {
  console.log('\n🔄 ATUALIZANDO COM DADOS REAIS DOS CORREIOS');
  console.log('═'.repeat(70));
  console.log('📋 Fonte: Site dos Correios (captura de tela fornecida)\n');
  
  try {
    const orderId = 63689;
    
    // Verificar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, trackingNumber: true }
    });
    
    if (!order) {
      console.log('❌ Pedido não encontrado');
      return;
    }
    
    console.log(`📦 Pedido #${orderId} - ${order.trackingNumber}\n`);
    
    // Limpar eventos existentes
    await prisma.shipmentUpdate.deleteMany({
      where: { orderId }
    });
    console.log('🗑️  Eventos antigos removidos\n');
    
    // Dados REAIS extraídos da imagem do site dos Correios
    const eventosReais = [
      {
        orderId,
        status: 'BDE', // Objeto entregue
        location: 'BELO HORIZONTE - MG',
        description: 'Objeto entregue ao destinatário',
        timestamp: new Date('2025-09-22T11:49:00')
      },
      {
        orderId,
        status: 'OEC', // Saiu para entrega
        location: 'BELO HORIZONTE - MG',
        description: 'Objeto saiu para entrega ao destinatário',
        timestamp: new Date('2025-09-22T10:48:00')
      },
      {
        orderId,
        status: 'CD', // Em transferência
        location: 'de Unidade de Tratamento, BELO HORIZONTE - MG para Unidade de Distribuição, Belo Horizonte - MG',
        description: 'Objeto em transferência - por favor aguarde',
        timestamp: new Date('2025-09-21T09:03:00')
      },
      {
        orderId,
        status: 'CD', // Em transferência
        location: 'de Unidade de Tratamento, CAJAMAR - SP para Unidade de Tratamento, Belo Horizonte - MG',
        description: 'Objeto em transferência - por favor aguarde',
        timestamp: new Date('2025-09-18T03:01:00')
      },
      {
        orderId,
        status: 'CD', // Em transferência
        location: 'de Agência dos Correios, SAO PAULO - SP para Unidade de Tratamento, Cajamar - SP',
        description: 'Objeto em transferência - por favor aguarde',
        timestamp: new Date('2025-09-16T15:11:00')
      },
      {
        orderId,
        status: 'PO', // Postado
        location: 'SAO PAULO - SP',
        description: 'Objeto postado',
        timestamp: new Date('2025-09-16T15:10:00')
      },
      {
        orderId,
        status: 'RO', // Etiqueta emitida
        location: 'BR',
        description: 'Etiqueta emitida',
        timestamp: new Date('2025-09-15T15:58:00')
      }
    ];
    
    // Inserir eventos reais
    console.log('💾 Salvando eventos reais dos Correios:\n');
    for (const evento of eventosReais) {
      await prisma.shipmentUpdate.create({
        data: evento
      });
      console.log(`✅ ${evento.timestamp.toLocaleString('pt-BR')} - ${evento.description}`);
      console.log(`   📍 ${evento.location}`);
      console.log('');
    }
    
    // Atualizar pedido com status ENTREGUE
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED', // ✅ ENTREGUE
        currentLocation: 'BELO HORIZONTE - MG',
        shippingCarrier: 'Correios',
        departureDate: new Date('2025-09-16'),
        updatedAt: new Date()
      }
    });
    
    console.log('═'.repeat(70));
    console.log('✅ PEDIDO ATUALIZADO COM SUCESSO!\n');
    console.log('📊 RESUMO:');
    console.log('─'.repeat(70));
    console.log(`   Total de eventos: ${eventosReais.length}`);
    console.log('   Status atual: DELIVERED (Entregue) ✅');
    console.log('   Localização: BELO HORIZONTE - MG');
    console.log('   Data de entrega: 22/09/2025 11:49');
    console.log('   Data de envio: 16/09/2025');
    console.log('');
    console.log('🎯 AÇÕES CONCLUÍDAS:');
    console.log('   ✅ Eventos reais dos Correios salvos no banco');
    console.log('   ✅ Status do pedido atualizado para ENTREGUE');
    console.log('   ✅ Localização atualizada para BELO HORIZONTE');
    console.log('   ✅ Dados sincronizados com o site dos Correios');
    console.log('');
    console.log('💡 PRÓXIMO PASSO:');
    console.log('   ➡️ Acesse /meus-pedidos/63689 no frontend');
    console.log('   ➡️ Você verá todos os 7 eventos reais dos Correios');
    console.log('   ➡️ Status aparecerá como "Entregue"');
    console.log('   ➡️ Timeline completa com todas as movimentações\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateWithRealCorreiosData();

