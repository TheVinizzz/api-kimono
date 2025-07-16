require('dotenv').config();

async function testCorreiosOrder() {
  console.log('🧪 Testando geração de código de rastreio para pedido 63638...');
  
  try {
    // Usar ts-node para importar módulos TypeScript
    require('ts-node').register();
    const { orderService } = require('./src/services/order.service.ts');
    
    // Testar com o pedido específico que estava falhando
    const resultado = await orderService.gerarCodigoRastreio(63638);
    
    console.log('✅ SUCESSO! Código de rastreio gerado:', resultado.trackingNumber);
    
  } catch (error) {
    console.error('❌ ERRO ao gerar código de rastreio:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testCorreiosOrder()
  .then(() => {
    console.log('🏁 Teste concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro crítico:', error);
    process.exit(1);
  }); 