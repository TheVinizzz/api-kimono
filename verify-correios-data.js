const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCorreiosData() {
  console.log('\n🔍 VERIFICANDO DADOS DOS CORREIOS vs BANCO DE DADOS');
  console.log('═'.repeat(70));
  
  try {
    const orderId = 63689;
    
    // 1. Buscar dados do banco
    console.log('\n📦 DADOS NO BANCO DE DADOS:');
    console.log('─'.repeat(70));
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
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
    
    console.log(`\nPedido #${order.id}`);
    console.log(`Código: ${order.trackingNumber}`);
    console.log(`Status: ${order.status}`);
    console.log(`Localização: ${order.currentLocation || 'N/A'}`);
    
    if (order.trackingUpdates && order.trackingUpdates.length > 0) {
      console.log(`\n📋 Eventos no banco (${order.trackingUpdates.length}):\n`);
      order.trackingUpdates.forEach((update, index) => {
        console.log(`${index + 1}. ${update.description}`);
        console.log(`   ${update.timestamp.toLocaleString('pt-BR')} - ${update.location}`);
      });
    } else {
      console.log('\n⚠️ Nenhum evento no banco de dados');
    }
    
    // 2. Consultar API dos Correios
    console.log('\n\n📡 DADOS REAIS DOS CORREIOS:');
    console.log('─'.repeat(70));
    
    const { CorreiosService } = require('./dist/services/correios.service');
    const correiosService = new CorreiosService();
    
    try {
      const rastreamento = await correiosService.rastrearObjeto(order.trackingNumber);
      
      if (!rastreamento || !rastreamento.eventos || rastreamento.eventos.length === 0) {
        console.log('\n⚠️ API dos Correios não retornou eventos');
        console.log('\n🔍 Verificando motivo:');
        console.log('   1. Código pode ainda não ter sido postado nos Correios');
        console.log('   2. Objeto pode estar em trânsito sem movimentação');
        console.log('   3. API dos Correios pode estar com problemas');
        
        console.log('\n💡 AÇÃO RECOMENDADA:');
        console.log('   - Verificar manualmente no site dos Correios:');
        console.log(`   - https://www.correios.com.br/app/rastreamento/index.php?objeto=${order.trackingNumber}`);
        
      } else {
        console.log(`\n✅ API retornou ${rastreamento.eventos.length} eventos:\n`);
        
        rastreamento.eventos.forEach((evento, index) => {
          console.log(`${index + 1}. ${evento.descricao}`);
          console.log(`   ${evento.data} ${evento.hora} - ${evento.local}`);
          console.log(`   Código: ${evento.codigo}`);
          if (evento.detalhe) {
            console.log(`   Detalhe: ${evento.detalhe}`);
          }
          console.log('');
        });
        
        // 3. Comparar dados
        console.log('\n🔄 COMPARAÇÃO:');
        console.log('─'.repeat(70));
        
        const eventosNoBanco = order.trackingUpdates.length;
        const eventosNosCorreios = rastreamento.eventos.length;
        
        if (eventosNoBanco === eventosNosCorreios) {
          console.log('✅ Quantidade de eventos: IGUAL');
        } else {
          console.log(`⚠️ Quantidade de eventos: DIFERENTE`);
          console.log(`   Banco: ${eventosNoBanco} eventos`);
          console.log(`   Correios: ${eventosNosCorreios} eventos`);
          console.log(`   Diferença: ${eventosNosCorreios - eventosNoBanco} eventos novos`);
        }
        
        // Verificar se último evento é o mesmo
        if (order.trackingUpdates.length > 0 && rastreamento.eventos.length > 0) {
          const ultimoNoBanco = order.trackingUpdates[0];
          const ultimoNosCorreios = rastreamento.eventos[0];
          
          console.log('\n📍 Último evento:');
          console.log(`   Banco: ${ultimoNoBanco.description}`);
          console.log(`   Correios: ${ultimoNosCorreios.descricao}`);
          
          if (ultimoNoBanco.description === ultimoNosCorreios.descricao) {
            console.log('   ✅ Eventos coincidem');
          } else {
            console.log('   ⚠️ Eventos diferentes - precisa atualizar!');
          }
        }
        
        console.log('\n💡 RECOMENDAÇÃO:');
        if (eventosNosCorreios > eventosNoBanco) {
          console.log('   ⚠️ Existem eventos novos nos Correios');
          console.log('   ➡️ Execute: node update-order-tracking.js');
          console.log('   ➡️ Ou inicie o rastreamento automático');
        } else if (eventosNoBanco === 0) {
          console.log('   ⚠️ Nenhum evento salvo no banco');
          console.log('   ➡️ Execute: node update-order-tracking.js');
        } else {
          console.log('   ✅ Dados estão sincronizados');
        }
      }
      
    } catch (apiError) {
      console.error('\n❌ Erro ao consultar Correios:', apiError.message);
      
      console.log('\n📋 Eventos da imagem que você compartilhou:');
      console.log('─'.repeat(70));
      console.log('\nSegundo o site dos Correios:');
      console.log('1. 22/09/2025 11:49 - Objeto entregue ao destinatário (BELO HORIZONTE - MG)');
      console.log('2. 22/09/2025 10:48 - Objeto saiu para entrega ao destinatário (BELO HORIZONTE - MG)');
      console.log('3. 21/09/2025 09:03 - Objeto em transferência (BELO HORIZONTE - MG)');
      console.log('4. 18/09/2025 03:01 - Objeto em transferência (CAJAMAR - SP)');
      console.log('5. 16/09/2025 15:11 - Objeto em transferência (SÃO PAULO - SP)');
      console.log('6. 16/09/2025 15:10 - Objeto postado (SÃO PAULO - SP)');
      console.log('7. 15/09/2025 15:58 - Etiqueta emitida');
      
      console.log('\n⚠️ IMPORTANTE:');
      console.log('   O objeto JÁ FOI ENTREGUE em 22/09/2025 11:49');
      console.log('   Status correto deveria ser: DELIVERED');
      console.log('   Localização: BELO HORIZONTE - MG');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCorreiosData();

