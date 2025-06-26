#!/usr/bin/env node

/**
 * Script para obter tokens OAuth 2.0 do Bling
 * Use este script para trocar o authorization code por access_token e refresh_token
 */

const axios = require('axios');
const readline = require('readline');

// Suas credenciais
const CLIENT_ID = 'a4722d933ec8e42628a60bca4e492ad9ad842670';
const CLIENT_SECRET = 'd17bf6177450edb2d79063e668a3eed7425bbae984de74d2806854141dbd';
const REDIRECT_URI = 'http://localhost:3000/callback';

// Interface para entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔑 Script para Obter Tokens OAuth 2.0 do Bling\n');

// Função para obter tokens
async function getTokens(authorizationCode) {
  try {
    console.log('🔄 Trocando authorization code por tokens...\n');
    
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: REDIRECT_URI
    });

    const response = await axios.post(
      'https://api.bling.com.br/oauth/token',
      tokenData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
        }
      }
    );

    console.log('✅ Tokens obtidos com sucesso!\n');
    console.log('📋 Copie estes valores para seu arquivo .env:\n');
    console.log('BLING_CLIENT_ID=' + CLIENT_ID);
    console.log('BLING_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('BLING_ACCESS_TOKEN=' + response.data.access_token);
    console.log('BLING_REFRESH_TOKEN=' + response.data.refresh_token);
    console.log('BLING_API_URL=https://api.bling.com.br');
    console.log('BLING_ENVIRONMENT=production\n');
    
    console.log('📊 Informações adicionais:');
    console.log('Token Type:', response.data.token_type);
    console.log('Expires In:', response.data.expires_in, 'segundos');
    console.log('Scope:', response.data.scope);
    
    // Salvar em arquivo .env
    const fs = require('fs');
    const envContent = `
# Configurações Bling OAuth 2.0
BLING_CLIENT_ID=${CLIENT_ID}
BLING_CLIENT_SECRET=${CLIENT_SECRET}
BLING_ACCESS_TOKEN=${response.data.access_token}
BLING_REFRESH_TOKEN=${response.data.refresh_token}
BLING_API_URL=https://api.bling.com.br
BLING_ENVIRONMENT=production
`;
    
    fs.writeFileSync('.env.bling', envContent.trim());
    console.log('\n💾 Tokens salvos em .env.bling');
    
  } catch (error) {
    console.error('❌ Erro ao obter tokens:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Erro:', error.response.data);
      
      if (error.response.status === 400) {
        console.error('\n💡 Possíveis causas:');
        console.error('- Authorization code expirado (válido por 10 minutos)');
        console.error('- Authorization code já foi usado');
        console.error('- Redirect URI não confere com o configurado no Bling');
      }
    } else {
      console.error('Erro:', error.message);
    }
  }
}

// Função principal
async function main() {
  console.log('📋 Passo 1: Obter Authorization Code');
  console.log('Acesse esta URL no seu navegador:\n');
  
  const authUrl = `https://api.bling.com.br/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=produtos:read produtos:write pedidos:read pedidos:write contatos:read contatos:write estoques:read estoques:write categorias:read categorias:write&state=random_state`;
  
  console.log(authUrl);
  console.log('\n📋 Passo 2: Após autorizar, copie o "code" da URL de retorno');
  console.log('Exemplo: http://localhost:3000/callback?code=SEU_CODIGO_AQUI&state=random_state\n');
  
  rl.question('Cole o authorization code aqui: ', async (authCode) => {
    if (!authCode || authCode.trim() === '') {
      console.error('❌ Authorization code é obrigatório!');
      rl.close();
      return;
    }
    
    await getTokens(authCode.trim());
    rl.close();
  });
}

// Executar
main().catch(console.error); 