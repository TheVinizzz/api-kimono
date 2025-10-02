const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function updateOrderTracking(orderId) {
  console.log(`\n🔄 ATUALIZANDO RASTREAMENTO DO PEDIDO #${orderId}`);
  console.log('═'.repeat(70));
  
  try {
    // 1. Buscar dados do pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        customerName: true,
        customerEmail: true
      }
    });
    
    if (!order) {
      console.log('❌ Pedido não encontrado');
      return;
    }
    
    console.log('\n📦 PEDIDO:');
    console.log(`   ID: #${order.id}`);
    console.log(`   Cliente: ${order.customerName}`);
    console.log(`   Código: ${order.trackingNumber}`);
    console.log(`   Status: ${order.status}`);
    
    if (!order.trackingNumber || order.trackingNumber === 'Não disponível') {
      console.log('\n⚠️ Pedido não tem código de rastreio válido');
      return;
    }
    
    // 2. Consultar API dos Correios diretamente
    console.log('\n📡 CONSULTANDO API DOS CORREIOS...');
    
    // Importar o serviço dos Correios
    const { CorreiosService } = require('./dist/services/correios.service');
    const correiosService = new CorreiosService();
    
    try {
      const rastreamento = await correiosService.rastrearObjeto(order.trackingNumber);
      
      if (!rastreamento || !rastreamento.eventos || rastreamento.eventos.length === 0) {
        console.log('\n⚠️ Nenhum evento encontrado para este código de rastreio');
        console.log('   Possíveis causas:');
        console.log('   - Código ainda não postado nos Correios');
        console.log('   - Código inválido');
        console.log('   - API dos Correios temporariamente indisponível');
        return;
      }
      
      console.log(`\n✅ ${rastreamento.eventos.length} eventos encontrados!\n`);
      
      // 3. Processar e salvar eventos
      let eventosNovos = 0;
      let eventoMaisRecente = null;
      
      for (const evento of rastreamento.eventos) {
        const timestamp = new Date(`${evento.data} ${evento.hora}`);
        
        // Verificar se evento já existe
        const eventoExiste = await prisma.shipmentUpdate.findFirst({
          where: {
            orderId: order.id,
            timestamp: timestamp,
            description: evento.descricao
          }
        });
        
        if (!eventoExiste) {
          await prisma.shipmentUpdate.create({
            data: {
              orderId: order.id,
              status: evento.codigo,
              location: evento.local,
              description: evento.descricao,
              timestamp: timestamp
            }
          });
          
          eventosNovos++;
          
          if (!eventoMaisRecente || timestamp > eventoMaisRecente.timestamp) {
            eventoMaisRecente = {
              timestamp,
              status: evento.codigo,
              description: evento.descricao,
              location: evento.local
            };
          }
        }
      }
      
      console.log(`💾 ${eventosNovos} novos eventos salvos no banco de dados`);
      
      // 4. Atualizar status do pedido baseado no evento mais recente
      if (eventoMaisRecente) {
        const statusMap = {
          'BDE': 'DELIVERED',
          'BDI': 'DELIVERED',
          'BDR': 'DELIVERED',
          'OEC': 'OUT_FOR_DELIVERY',
          'DO': 'IN_TRANSIT',
          'CD': 'IN_TRANSIT',
          'PO': 'SHIPPED',
          'RO': 'PROCESSING'
        };
        
        let novoStatus = statusMap[eventoMaisRecente.status] || order.status;
        
        // Verificar se foi entregue pela descrição
        if (eventoMaisRecente.description.toLowerCase().includes('entregue') ||
            eventoMaisRecente.description.toLowerCase().includes('objeto entregue')) {
          novoStatus = 'DELIVERED';
        }
        
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: novoStatus,
            currentLocation: eventoMaisRecente.location,
            shippingCarrier: 'Correios',
            updatedAt: new Date()
          }
        });
        
        console.log(`\n✅ Status do pedido atualizado: ${novoStatus}`);
        console.log(`   Localização: ${eventoMaisRecente.location}`);
      }
      
      // 5. Exibir eventos salvos
      console.log('\n📋 EVENTOS DE RASTREAMENTO:\n');
      
      rastreamento.eventos.forEach((evento, index) => {
        console.log(`${index + 1}. ${evento.descricao}`);
        console.log(`   📅 ${evento.data} ${evento.hora}`);
        console.log(`   📍 ${evento.local}`);
        console.log(`   🏷️  ${evento.codigo}`);
        if (evento.detalhe) {
          console.log(`   ℹ️  ${evento.detalhe}`);
        }
        console.log('');
      });
      
    } catch (apiError) {
      console.error('\n❌ Erro ao consultar API dos Correios:', apiError.message);
      console.log('\n💡 Verifique:');
      console.log('   - Credenciais dos Correios no .env');
      console.log('   - Conectividade com a API dos Correios');
      console.log('   - Validade do código de rastreio');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar para o pedido #63689
updateOrderTracking(63689);

