const NodeCorreios = require('node-correios');

async function testShipping() {
  console.log('🚚 Testando integração com API dos Correios...\n');
  
  const correios = new NodeCorreios();
  
  try {
    // Teste básico de cálculo de frete
    const resultado = await correios.calcPrecoPrazo({
      nCdServico: '04014,04510', // SEDEX e PAC
      sCepOrigem: '01310100',    // São Paulo
      sCepDestino: '69004010',   // Manaus (mesmo CEP da imagem)
      nVlPeso: '0.8',            // 800g (peso do kimono)
      nCdFormato: '1',           // Caixa/pacote
      nVlComprimento: '30',      // 30cm
      nVlAltura: '5',            // 5cm
      nVlLargura: '25',          // 25cm
      nVlDiametro: '0',          // 0cm
      sCdMaoPropria: 'N',        // Não
      nVlValorDeclarado: '0',    // Sem valor declarado
      sCdAvisoRecebimento: 'N'   // Não
    });

    console.log('✅ Resultado da API dos Correios:');
    console.log(JSON.stringify(resultado, null, 2));
    
    if (Array.isArray(resultado)) {
      resultado.forEach((item, index) => {
        console.log(`\n📦 Opção ${index + 1}:`);
        console.log(`   Serviço: ${item.Codigo}`);
        console.log(`   Valor: R$ ${item.Valor}`);
        console.log(`   Prazo: ${item.PrazoEntrega} dias úteis`);
        console.log(`   Erro: ${item.Erro || 'Nenhum'}`);
        console.log(`   Mensagem: ${item.MsgErro || 'OK'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API dos Correios:');
    console.error(error);
  }
}

// Executar teste
testShipping(); 