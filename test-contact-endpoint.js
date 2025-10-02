console.log('\n🌐 TESTANDO ENDPOINT DE CONTATO');
console.log('═'.repeat(60));

const fetch = require('node-fetch');

// Dados de teste
const contactData = {
  name: 'João Silva',
  email: 'joao.silva@teste.com',
  subject: 'Dúvida sobre produtos',
  message: 'Olá, gostaria de saber mais informações sobre os kimonos disponíveis. Vocês têm alguma promoção especial?'
};

// URL do endpoint (ajustar conforme necessário)
const apiUrl = process.env.API_URL || 'http://localhost:4000';

console.log('\n1️⃣ DADOS DE TESTE:');
console.log('─'.repeat(60));
console.log('Nome:', contactData.name);
console.log('Email:', contactData.email);
console.log('Assunto:', contactData.subject);
console.log('Mensagem:', contactData.message);

console.log('\n2️⃣ ENVIANDO PARA O ENDPOINT:');
console.log('─'.repeat(60));
console.log('URL:', `${apiUrl}/api/contact`);

// Testar endpoint
fetch(`${apiUrl}/api/contact`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(contactData)
})
.then(response => response.json())
.then(data => {
  console.log('\n3️⃣ RESPOSTA DO SERVIDOR:');
  console.log('─'.repeat(60));
  console.log('Status:', data.success ? '✅ Sucesso' : '❌ Erro');
  console.log('Mensagem:', data.message);
  
  if (data.success) {
    console.log('\n🎉 EMAIL DE CONTATO ENVIADO COM SUCESSO!');
    console.log('📧 Email enviado para: viniprograming@gmail.com');
    console.log('📧 Reply-To:', contactData.email);
  } else {
    console.log('\n❌ ERRO NO ENVIO DO EMAIL');
  }
})
.catch(error => {
  console.log('\n❌ ERRO NA REQUISIÇÃO:');
  console.log('─'.repeat(60));
  console.log('Erro:', error.message);
  console.log('\n💡 Verifique se o servidor está rodando em:', apiUrl);
})
.finally(() => {
  console.log('\n═'.repeat(60));
  console.log('🏁 TESTE DO ENDPOINT FINALIZADO!');
  console.log('═'.repeat(60));
});
