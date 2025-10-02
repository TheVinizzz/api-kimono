console.log('\n🔍 DEBUGGING CONTATO - VERIFICANDO CONFIGURAÇÃO');
console.log('═'.repeat(60));

// 1. Verificar variáveis de ambiente
console.log('\n1️⃣ VARIÁVEIS DE AMBIENTE:');
console.log('─'.repeat(60));
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NÃO DEFINIDO');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'DEFINIDO' : 'NÃO DEFINIDO');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NÃO DEFINIDO');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NÃO DEFINIDO');

// 2. Verificar se o servidor está rodando
console.log('\n2️⃣ TESTANDO SERVIDOR:');
console.log('─'.repeat(60));

const testServer = async () => {
  try {
    const fetch = require('node-fetch');
    
    // Testar health check primeiro
    const healthResponse = await fetch('http://localhost:4000/health');
    if (healthResponse.ok) {
      console.log('✅ Servidor está rodando em http://localhost:4000');
    } else {
      console.log('❌ Servidor não está respondendo corretamente');
      return;
    }
    
    // Testar endpoint de contato
    console.log('\n3️⃣ TESTANDO ENDPOINT /api/contact:');
    console.log('─'.repeat(60));
    
    const contactData = {
      name: 'Teste Debug',
      email: 'teste@debug.com',
      subject: 'Teste de Debug',
      message: 'Este é um teste para verificar se o endpoint está funcionando.'
    };
    
    console.log('Enviando dados:', contactData);
    
    const contactResponse = await fetch('http://localhost:4000/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData)
    });
    
    console.log('Status da resposta:', contactResponse.status);
    console.log('Headers da resposta:', Object.fromEntries(contactResponse.headers.entries()));
    
    const responseText = await contactResponse.text();
    console.log('Resposta do servidor:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('JSON parseado:', responseJson);
      
      if (responseJson.success) {
        console.log('✅ Endpoint funcionando corretamente!');
      } else {
        console.log('❌ Endpoint retornou erro:', responseJson.message);
      }
    } catch (parseError) {
      console.log('❌ Erro ao fazer parse da resposta JSON:', parseError.message);
      console.log('Resposta bruta:', responseText);
    }
    
  } catch (error) {
    console.log('❌ Erro ao testar servidor:', error.message);
    console.log('💡 Verifique se o servidor está rodando: npm start');
  }
};

testServer().finally(() => {
  console.log('\n═'.repeat(60));
  console.log('🏁 DEBUG FINALIZADO!');
  console.log('═'.repeat(60));
});
