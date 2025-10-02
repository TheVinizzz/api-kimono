console.log('\n🌐 TESTANDO INTEGRAÇÃO FRONTEND-BACKEND');
console.log('═'.repeat(60));

const fetch = require('node-fetch');

// Simular requisição do frontend
const testFrontendRequest = async () => {
  try {
    console.log('\n1️⃣ SIMULANDO REQUISIÇÃO DO FRONTEND:');
    console.log('─'.repeat(60));
    
    // URL que o frontend usaria
    const frontendApiUrl = 'http://localhost:4000/api'; // API_BASE_URL padrão
    const endpoint = 'contact';
    const fullUrl = `${frontendApiUrl}/${endpoint}`;
    
    console.log('URL completa:', fullUrl);
    
    // Dados que o frontend enviaria
    const contactData = {
      name: 'João Silva',
      email: 'joao.silva@teste.com',
      subject: 'Dúvida sobre produtos',
      message: 'Olá, gostaria de saber mais informações sobre os kimonos disponíveis.'
    };
    
    console.log('Dados enviados:', contactData);
    
    // Headers que o frontend usaria (simulando apiFetch)
    const headers = {
      'Content-Type': 'application/json',
      'Api-Key': 'dev-api-key-2024',
      'Origin': 'http://localhost:3000',
    };
    
    console.log('Headers:', headers);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(contactData)
    });
    
    console.log('\n2️⃣ RESPOSTA DO SERVIDOR:');
    console.log('─'.repeat(60));
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Resposta bruta:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('JSON parseado:', responseJson);
      
      if (responseJson.success) {
        console.log('\n✅ SUCESSO! Email enviado corretamente!');
        console.log('📧 Email enviado para: viniprograming@gmail.com');
      } else {
        console.log('\n❌ ERRO no servidor:', responseJson.message);
      }
    } catch (parseError) {
      console.log('\n❌ ERRO ao fazer parse da resposta:', parseError.message);
    }
    
  } catch (error) {
    console.log('\n❌ ERRO na requisição:', error.message);
    console.log('Stack:', error.stack);
  }
};

testFrontendRequest().finally(() => {
  console.log('\n═'.repeat(60));
  console.log('🏁 TESTE FRONTEND FINALIZADO!');
  console.log('═'.repeat(60));
});
