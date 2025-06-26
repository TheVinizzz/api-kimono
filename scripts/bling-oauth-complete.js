const express = require('express');
const https = require('https');
const { URL } = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURAÇÕES - ATUALIZE COM SUAS CREDENCIAIS
// ==========================================
const CLIENT_ID = process.env.BLING_CLIENT_ID
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3001/callback';
const PORT = 3001;

// URLs da API do Bling
const BLING_AUTH_URL = 'https://www.bling.com.br/Api/v3/oauth/authorize';
const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';
const BLING_API_URL = 'https://api.bling.com.br/Api/v3';

// Arquivo para salvar os tokens
const TOKENS_FILE = path.join(__dirname, '../tokens.json');

// ==========================================
// UTILITÁRIOS
// ==========================================

// Gerar state para segurança OAuth
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

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
        'User-Agent': 'Bling-OAuth-Client/1.0',
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

// Salvar tokens no arquivo
function saveTokens(tokens) {
  try {
    const tokenData = {
      ...tokens,
      timestamp: Date.now(),
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokenData, null, 2));
    console.log('✅ Tokens salvos em:', TOKENS_FILE);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar tokens:', error.message);
    return false;
  }
}

// Carregar tokens do arquivo
function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const data = fs.readFileSync(TOKENS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ Erro ao carregar tokens:', error.message);
  }
  return null;
}

// Verificar se o token está expirado
function isTokenExpired(tokens) {
  if (!tokens || !tokens.expires_at) return true;
  return Date.now() > tokens.expires_at - 300000; // 5 minutos antes da expiração
}

// ==========================================
// FUNÇÕES OAUTH
// ==========================================

// Trocar código de autorização por tokens
async function exchangeCodeForTokens(code, state) {
  console.log('🔄 Trocando código de autorização por tokens...');
  
  const tokenData = {
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI
  };

  try {
    const response = await makeHttpsRequest(BLING_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, tokenData);

    if (response.statusCode === 200) {
      console.log('✅ Tokens obtidos com sucesso!');
      console.log('📊 Dados recebidos:', JSON.stringify(response.data, null, 2));
      
      if (saveTokens(response.data)) {
        return response.data;
      }
    } else {
      console.error('❌ Erro ao obter tokens:', response.statusCode, response.data);
    }
  } catch (error) {
    console.error('❌ Erro na requisição de tokens:', error.message);
  }
  
  return null;
}

// Renovar access token usando refresh token
async function refreshAccessToken(refreshToken) {
  console.log('🔄 Renovando access token...');
  
  const tokenData = {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken
  };

  try {
    const response = await makeHttpsRequest(BLING_TOKEN_URL, {
      method: 'POST'
    }, tokenData);

    if (response.statusCode === 200) {
      console.log('✅ Token renovado com sucesso!');
      
      if (saveTokens(response.data)) {
        return response.data;
      }
    } else {
      console.error('❌ Erro ao renovar token:', response.statusCode, response.data);
    }
  } catch (error) {
    console.error('❌ Erro na renovação do token:', error.message);
  }
  
  return null;
}

// ==========================================
// FUNÇÕES DA API DO BLING
// ==========================================

// Fazer requisição autenticada para a API do Bling
async function makeAuthenticatedRequest(endpoint, method = 'GET', data = null) {
  let tokens = loadTokens();
  
  if (!tokens) {
    console.error('❌ Nenhum token encontrado. Execute a autenticação primeiro.');
    return null;
  }

  // Verificar se o token precisa ser renovado
  if (isTokenExpired(tokens)) {
    console.log('⏰ Token expirado, renovando...');
    tokens = await refreshAccessToken(tokens.refresh_token);
    if (!tokens) {
      console.error('❌ Falha ao renovar token. Execute a autenticação novamente.');
      return null;
    }
  }

  const url = `${BLING_API_URL}${endpoint}`;
  
  try {
    const response = await makeHttpsRequest(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    }, data);

    return response;
  } catch (error) {
    console.error('❌ Erro na requisição autenticada:', error.message);
    return null;
  }
}

// Obter informações da empresa
async function getCompanyInfo() {
  console.log('🏢 Obtendo informações da empresa...');
  const response = await makeAuthenticatedRequest('/empresas');
  
  if (response && response.statusCode === 200) {
    console.log('✅ Informações da empresa:', JSON.stringify(response.data, null, 2));
    return response.data;
  } else {
    console.error('❌ Erro ao obter informações da empresa:', response?.statusCode, response?.data);
    return null;
  }
}

// Obter produtos
async function getProducts(limit = 10) {
  console.log(`📦 Obtendo produtos (limite: ${limit})...`);
  const response = await makeAuthenticatedRequest(`/produtos?limite=${limit}`);
  
  if (response && response.statusCode === 200) {
    console.log('✅ Produtos obtidos:', JSON.stringify(response.data, null, 2));
    return response.data;
  } else {
    console.error('❌ Erro ao obter produtos:', response?.statusCode, response?.data);
    return null;
  }
}

// Obter categorias
async function getCategories() {
  console.log('📂 Obtendo categorias...');
  const response = await makeAuthenticatedRequest('/categorias');
  
  if (response && response.statusCode === 200) {
    console.log('✅ Categorias obtidas:', JSON.stringify(response.data, null, 2));
    return response.data;
  } else {
    console.error('❌ Erro ao obter categorias:', response?.statusCode, response?.data);
    return null;
  }
}

// Obter pedidos
async function getOrders(limit = 10) {
  console.log(`📋 Obtendo pedidos (limite: ${limit})...`);
  const response = await makeAuthenticatedRequest(`/pedidos/vendas?limite=${limit}`);
  
  if (response && response.statusCode === 200) {
    console.log('✅ Pedidos obtidos:', JSON.stringify(response.data, null, 2));
    return response.data;
  } else {
    console.error('❌ Erro ao obter pedidos:', response?.statusCode, response?.data);
    return null;
  }
}

// ==========================================
// SERVIDOR WEB PARA OAUTH
// ==========================================

function startOAuthServer() {
  const app = express();
  let serverState = null;

  // Página inicial - inicia o fluxo OAuth
  app.get('/', (req, res) => {
    serverState = generateState();
    
    const authUrl = new URL(BLING_AUTH_URL);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('state', serverState);
    authUrl.searchParams.append('scope', 'read write');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bling OAuth 2.0 - Autenticação</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .container { text-align: center; }
          .btn { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; }
          .btn:hover { background: #0056b3; }
          .info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: left; }
          .credentials { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔐 Bling OAuth 2.0 - Autenticação</h1>
          
          <div class="credentials">
            <strong>⚠️ IMPORTANTE:</strong> Certifique-se de que suas credenciais estão configuradas:
            <br><br>
            <strong>CLIENT_ID:</strong> ${CLIENT_ID.length > 10 ? CLIENT_ID.substring(0, 10) + '...' : CLIENT_ID || 'NÃO CONFIGURADO'}
            <br>
            <strong>CLIENT_SECRET:</strong> ${CLIENT_SECRET ? '***CONFIGURADO***' : 'NÃO CONFIGURADO'}
          </div>
          
          <div class="info">
            <h3>📋 Como funciona:</h3>
            <ol>
              <li>Clique no botão "Autorizar no Bling" abaixo</li>
              <li>Você será redirecionado para o Bling</li>
              <li>Faça login e autorize o aplicativo</li>
              <li>Você será redirecionado de volta com os tokens</li>
              <li>Os tokens serão salvos automaticamente</li>
            </ol>
          </div>
          
          <a href="${authUrl.toString()}" class="btn">🚀 Autorizar no Bling</a>
          
          <div class="info">
            <h3>🔧 Configuração Manual:</h3>
            <p>Se precisar configurar as credenciais manualmente, edite o arquivo ou defina as variáveis de ambiente:</p>
            <pre>
BLING_CLIENT_ID=seu_client_id
BLING_CLIENT_SECRET=seu_client_secret
            </pre>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Callback do OAuth
  app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Erro na Autenticação</title><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1>❌ Erro na Autenticação</h1>
          <p><strong>Erro:</strong> ${error}</p>
          <p><a href="/">← Tentar Novamente</a></p>
        </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Código não recebido</title><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1>❌ Código de autorização não recebido</h1>
          <p><a href="/">← Tentar Novamente</a></p>
        </body>
        </html>
      `);
      return;
    }

    if (state !== serverState) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Erro de Segurança</title><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1>❌ Erro de Segurança</h1>
          <p>State parameter inválido. Possível ataque CSRF.</p>
          <p><a href="/">← Tentar Novamente</a></p>
        </body>
        </html>
      `);
      return;
    }

    // Trocar código por tokens
    const tokens = await exchangeCodeForTokens(code, state);

    if (tokens) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Autenticação Bem-sucedida</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .tokens { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; }
            .btn { background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px; }
            .btn:hover { background: #218838; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Autenticação Bem-sucedida!</h1>
            <p>Tokens obtidos e salvos com sucesso!</p>
          </div>
          
          <div class="tokens">
            <h3>🔑 Informações dos Tokens:</h3>
            <p><strong>Access Token:</strong> ${tokens.access_token.substring(0, 20)}...</p>
            <p><strong>Refresh Token:</strong> ${tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'N/A'}</p>
            <p><strong>Expires In:</strong> ${tokens.expires_in} segundos</p>
            <p><strong>Token Type:</strong> ${tokens.token_type}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="/test" class="btn">🧪 Testar API</a>
            <a href="/close" class="btn">❌ Fechar Servidor</a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Erro ao Obter Tokens</title><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1>❌ Erro ao Obter Tokens</h1>
          <p>Falha na troca do código de autorização por tokens.</p>
          <p>Verifique suas credenciais e tente novamente.</p>
          <p><a href="/">← Tentar Novamente</a></p>
        </body>
        </html>
      `);
    }
  });

  // Testar API
  app.get('/test', async (req, res) => {
    const companyInfo = await getCompanyInfo();
    const products = await getProducts(5);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Teste da API Bling</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 1000px; margin: 20px auto; padding: 20px; }
          .result { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .success { background: #d4edda; color: #155724; }
          .error { background: #f8d7da; color: #721c24; }
          pre { background: #f1f1f1; padding: 10px; border-radius: 3px; overflow-x: auto; }
          .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px; }
        </style>
      </head>
      <body>
        <h1>🧪 Teste da API Bling</h1>
        
        <div class="result ${companyInfo ? 'success' : 'error'}">
          <h3>🏢 Informações da Empresa:</h3>
          <pre>${JSON.stringify(companyInfo, null, 2)}</pre>
        </div>
        
        <div class="result ${products ? 'success' : 'error'}">
          <h3>📦 Produtos (primeiros 5):</h3>
          <pre>${JSON.stringify(products, null, 2)}</pre>
        </div>
        
        <div style="text-align: center;">
          <a href="/" class="btn">← Voltar</a>
          <a href="/close" class="btn">❌ Fechar Servidor</a>
        </div>
      </body>
      </html>
    `);
  });

  // Fechar servidor
  app.get('/close', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Servidor Fechado</title><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center;">
        <h1>✅ Servidor Fechado</h1>
        <p>Autenticação concluída com sucesso!</p>
        <p>Os tokens foram salvos em: <code>${TOKENS_FILE}</code></p>
        <p>Você pode fechar esta janela.</p>
      </body>
      </html>
    `);
    
    setTimeout(() => {
      console.log('🔚 Fechando servidor...');
      process.exit(0);
    }, 2000);
  });

  const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SERVIDOR OAUTH BLING INICIADO');
    console.log('='.repeat(60));
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔑 Client ID: ${CLIENT_ID}`);
    console.log(`🔐 Client Secret: ${CLIENT_SECRET ? '***CONFIGURADO***' : '❌ NÃO CONFIGURADO'}`);
    console.log(`📁 Tokens serão salvos em: ${TOKENS_FILE}`);
    console.log('='.repeat(60));
    console.log('\n📖 INSTRUÇÕES:');
    console.log('1. Abra http://localhost:3000 no seu navegador');
    console.log('2. Clique em "Autorizar no Bling"');
    console.log('3. Faça login no Bling e autorize o aplicativo');
    console.log('4. Os tokens serão salvos automaticamente');
    console.log('\n⚠️  IMPORTANTE: Configure suas credenciais antes de continuar!');
    console.log('='.repeat(60) + '\n');
  });

  return server;
}

// ==========================================
// FUNÇÃO PRINCIPAL
// ==========================================

async function main() {
  console.log('\n🔐 BLING OAUTH 2.0 - AUTENTICAÇÃO COMPLETA');
  console.log('='.repeat(50));

  // Verificar se as credenciais estão configuradas
  if (!CLIENT_ID || CLIENT_ID === 'SEU_CLIENT_ID_AQUI') {
    console.error('❌ CLIENT_ID não configurado!');
    console.log('📝 Configure a variável BLING_CLIENT_ID ou edite o script.');
    return;
  }

  if (!CLIENT_SECRET || CLIENT_SECRET === 'SEU_CLIENT_SECRET_AQUI') {
    console.error('❌ CLIENT_SECRET não configurado!');
    console.log('📝 Configure a variável BLING_CLIENT_SECRET ou edite o script.');
    return;
  }

  // Verificar se já existem tokens válidos
  const existingTokens = loadTokens();
  if (existingTokens && !isTokenExpired(existingTokens)) {
    console.log('✅ Tokens válidos encontrados!');
    console.log('🧪 Testando API...');
    
    await getCompanyInfo();
    await getProducts(3);
    await getCategories();
    
    console.log('\n✨ Tudo funcionando! Use os outros scripts para sincronização.');
    return;
  }

  // Iniciar servidor OAuth
  console.log('🌐 Iniciando servidor OAuth...');
  startOAuthServer();
}

// ==========================================
// EXECUTAR SE CHAMADO DIRETAMENTE
// ==========================================

if (require.main === module) {
  main().catch(console.error);
}

// ==========================================
// EXPORTAR FUNÇÕES
// ==========================================

module.exports = {
  makeAuthenticatedRequest,
  getCompanyInfo,
  getProducts,
  getCategories,
  getOrders,
  loadTokens,
  saveTokens,
  refreshAccessToken,
  isTokenExpired
};