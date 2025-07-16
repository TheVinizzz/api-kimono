const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configurações
const API_BASE = 'http://localhost:4000/api';
const JWT_SECRET = 'sua_chave_secreta_para_jwt';

// Criar token de administrador
function criarTokenAdmin() {
  return jwt.sign(
    { 
      userId: 1,
      email: 'admin@exemplo.com',
      role: 'ADMIN'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Processar pedidos pagos
async function processarPedidosPagos() {
  try {
    console.log('\n🔄 Processando pedidos pagos...');
    
    const token = criarTokenAdmin();
    console.log('🔑 Token gerado:', token);
    
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
    
    console.log('✅ Resposta do servidor:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao processar pedidos pagos:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Verificar status da integração
async function verificarStatusIntegracao() {
  try {
    console.log('\n🔍 Verificando status da integração...');
    
    const token = criarTokenAdmin();
    
    const response = await axios.get(
      `${API_BASE}/correios/status-integracao`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('📊 Status da integração:');
    console.log(`- Configuração válida: ${response.data.status.configValida ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`- Conexão OK: ${response.data.status.conexaoOk ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`- Token válido: ${response.data.status.tokenValido ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`- Ambiente: ${response.data.status.ambiente}`);
    console.log(`- Pedidos pendentes: ${response.data.status.pedidosPendentes}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao verificar status da integração:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Dados:', error.response.data);
    } else {
      console.error(error.message);
    }
    return null;
  }
}

// Função principal
async function main() {
  try {
    // Primeiro verificar o status
    await verificarStatusIntegracao();
    
    // Depois processar os pedidos
    await processarPedidosPagos();
    
    // Verificar novamente para ver se o número de pedidos pendentes diminuiu
    await verificarStatusIntegracao();
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
  }
}

// Executar o script
main(); 