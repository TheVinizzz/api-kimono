const https = require('https');
const { URL } = require('url');

// ==========================================
// CONFIGURE SUAS CREDENCIAIS AQUI
// ==========================================
const CLIENT_ID = 'a4722d933ec8e42628a60bca4e492ad9ad842670'; // ← SUBSTITUA AQUI
const CLIENT_SECRET = 'd17bf6177450edb2d79063e668a3eed7425bbae984de74d2806854141dbd'; // ← SUBSTITUA AQUI

// URLs da API do Bling
const BLING_AUTH_URL = 'https://www.bling.com.br/Api/v3/oauth/authorize';
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';
const BLING_API_URL = 'https://api.bling.com.br/Api/v3';

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

// Fazer requisições HTTPS
function makeHttpsRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Bling-Test-Client/1.0',
        ...options.headers
      }
    };

    if (data && (options.method === 'POST' || options.method === 'PUT')) {
      const postData = typeof data === 'string' ? data : new URLSearchParams(data).toString();
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(requestOptions, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && (options.method === 'POST' || options.method === 'PUT')) {
      const postData = typeof data === 'string' ? data : new URLSearchParams(data).toString();
      req.write(postData);
    }

    req.end();
  });
}

// ==========================================
// TESTE RÁPIDO SEM OAUTH
// ==========================================

async function testBlingConnection() {
  console.log('\n🔍 TESTE RÁPIDO DE CONEXÃO COM BLING');
  console.log('==================================================');
  
  // Verificar se as credenciais estão configuradas
  if (CLIENT_ID === 'SEU_CLIENT_ID_AQUI' || CLIENT_SECRET === 'SEU_CLIENT_SECRET_AQUI') {
    console.log('❌ CREDENCIAIS NÃO CONFIGURADAS!');
    console.log('📝 Edite este arquivo e substitua:');
    console.log('   CLIENT_ID = "seu_client_id_real"');
    console.log('   CLIENT_SECRET = "seu_client_secret_real"');
    console.log('\n📍 Onde encontrar as credenciais:');
    console.log('   1. Acesse: https://www.bling.com.br/');
    console.log('   2. Login → Configurações → Aplicações → API');
    console.log('   3. Crie/edite uma aplicação');
    console.log('   4. Copie CLIENT_ID e CLIENT_SECRET');
    return;
  }
  
  console.log('✅ Credenciais configuradas!');
  console.log('📊 CLIENT_ID:', CLIENT_ID.substring(0, 10) + '...');
  
  // Gerar URL de autorização
  const authUrl = `${BLING_AUTH_URL}?` + new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: 'http://localhost:3000/callback',
    scope: 'read write',
    state: 'test123'
  }).toString();
  
  console.log('\n🔗 URL DE AUTORIZAÇÃO GERADA:');
  console.log('==================================================');
  console.log(authUrl);
  
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('==================================================');
  console.log('1. 📋 COPIE a URL acima');
  console.log('2. 🌐 ABRA no seu navegador');
  console.log('3. 🔐 FAÇA LOGIN no Bling');
  console.log('4. ✅ AUTORIZE a aplicação');
  console.log('5. 📝 COPIE o código da URL de retorno');
  console.log('6. 🔄 EXECUTE: node scripts/bling-oauth-complete.js');
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('==================================================');
  console.log('- Configure no Bling a URL de callback: http://localhost:3000/callback');
  console.log('- Este é apenas um teste de conectividade');
  console.log('- Para dados reais, use o script completo de OAuth');
  
  // Testar se as credenciais são válidas fazendo uma requisição básica
  console.log('\n🧪 TESTANDO CREDENCIAIS...');
  console.log('==================================================');
  
  try {
    // Tentar uma requisição que deve falhar mas nos dará informações
    const response = await makeHttpsRequest(`${BLING_API_URL}/empresas`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token_invalido_para_teste'
      }
    });
    
    console.log('📊 Status da resposta:', response.statusCode);
    
    if (response.statusCode === 401) {
      console.log('✅ API está respondendo (erro 401 esperado sem token válido)');
      console.log('✅ Suas credenciais provavelmente estão corretas');
    } else {
      console.log('📊 Resposta inesperada:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Erro na conexão:', error.message);
    console.log('🔍 Verifique sua conexão com a internet');
  }
}

// ==========================================
// EXECUTAR TESTE
// ==========================================

if (require.main === module) {
  testBlingConnection().catch(console.error);
}

module.exports = {
  testBlingConnection,
  makeHttpsRequest,
  BLING_API_URL,
  CLIENT_ID,
  CLIENT_SECRET
}; 