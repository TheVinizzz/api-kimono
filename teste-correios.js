// Script para testar a integração com os Correios
// Execute: node teste-correios.js

require('dotenv').config();
const axios = require('axios');

// Configuração da API
const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_BASE = `${API_URL}/api`;

// Obter token JWT de admin (você precisará gerar um token válido)
// Para testes, você pode usar o endpoint de login para obter um token
async function obterTokenAdmin() {
  try {
    // Se você já tem um token fixo para testes, pode usá-lo diretamente
    const tokenFixo = process.env.ADMIN_TOKEN;
    if (tokenFixo) {
      console.log('✅ Usando token fixo de ambiente');
      return tokenFixo;
    }
    
    // Caso contrário, tenta fazer login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'senha123'
    });
    
    console.log('✅ Login realizado com sucesso');
    return loginResponse.data.token;
  } catch (error) {
    console.error('❌ Erro ao obter token:', error.message);
    console.log('⚠️ Use um token fixo definindo a variável ADMIN_TOKEN');
    return null;
  }
}

// Testar configuração dos Correios
async function testarConfiguracao(token) {
  try {
    console.log('\n1️⃣ Testando configuração dos Correios...');
    
    const response = await axios.get(`${API_BASE}/correios/testar-conexao`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Configuração dos Correios:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Erro na configuração:', error.response?.data?.error || error.message);
    
    // Verificar problemas específicos
    if (error.response?.status === 400) {
      console.log('⚠️ Verifique se todas as variáveis de ambiente dos Correios estão configuradas');
    } else if (error.response?.status === 401) {
      console.log('⚠️ Token de autenticação inválido ou expirado');
    }
    
    return false;
  }
}

// Gerar código de rastreio para um pedido
async function gerarCodigoRastreio(token, orderId) {
  try {
    console.log(`\n2️⃣ Gerando código de rastreio para pedido ${orderId}...`);
    
    const response = await axios.post(
      `${API_BASE}/correios/gerar-rastreio/${orderId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Código gerado com sucesso!');
    console.log('📦 Pedido:', response.data.orderId);
    console.log('🔢 Código de rastreio:', response.data.trackingNumber);
    
    return response.data.trackingNumber;
  } catch (error) {
    console.error('❌ Erro ao gerar código:', error.response?.data?.error || error.message);
    
    // Verificar problemas específicos
    if (error.response?.status === 400) {
      console.log('⚠️ Possíveis causas:');
      console.log('  - Pedido não encontrado');
      console.log('  - Pedido não está pago');
      console.log('  - Endereço de entrega inválido');
      console.log('  - Configuração dos Correios incompleta');
    }
    
    return null;
  }
}

// Processar todos os pedidos pagos
async function processarPedidosPagos(token) {
  try {
    console.log('\n3️⃣ Processando todos os pedidos pagos...');
    
    const response = await axios.post(
      `${API_BASE}/correios/processar-pedidos`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Processamento iniciado:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Erro no processamento:', error.response?.data?.error || error.message);
    return false;
  }
}

// Rastrear um código
async function rastrearCodigo(codigo) {
  try {
    console.log(`\n4️⃣ Rastreando código ${codigo}...`);
    
    const response = await axios.get(`${API_BASE}/correios/rastrear/${codigo}`);
    
    console.log('✅ Informações de rastreamento:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao rastrear:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 404) {
      console.log('⚠️ Código de rastreio não encontrado ou inválido');
    }
    
    return null;
  }
}

// Função principal para executar todos os testes
async function executarTestes() {
  try {
    console.log('🚀 Iniciando testes da integração com os Correios...\n');
    
    // 1. Obter token de admin
    console.log('🔑 Obtendo token de autenticação...');
    const token = await obterTokenAdmin();
    
    if (!token) {
      console.error('❌ Não foi possível obter um token válido. Testes abortados.');
      return;
    }
    
    // 2. Testar configuração
    const configOk = await testarConfiguracao(token);
    
    if (!configOk) {
      console.warn('⚠️ Configuração com problemas. Continuando testes...');
    }
    
    // 3. Gerar código para um pedido específico
    // Substitua pelo ID de um pedido real que esteja no status PAID
    const orderId = process.argv[2] || 1;
    const codigoRastreio = await gerarCodigoRastreio(token, orderId);
    
    // 4. Processar todos os pedidos pagos
    await processarPedidosPagos(token);
    
    // 5. Rastrear um código (pode ser o gerado ou um exemplo)
    const codigoParaRastrear = codigoRastreio || 'BR123456789BR';
    await rastrearCodigo(codigoParaRastrear);
    
    console.log('\n🎉 Testes concluídos!');
    
  } catch (error) {
    console.error('\n❌ Erro geral nos testes:', error.message);
  }
}

// Executar testes se for chamado diretamente
if (require.main === module) {
  executarTestes();
}

module.exports = {
  testarConfiguracao,
  gerarCodigoRastreio,
  processarPedidosPagos,
  rastrearCodigo,
  executarTestes
}; 