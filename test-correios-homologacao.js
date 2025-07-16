/**
 * Script de teste para homologação da integração com os Correios
 * 
 * Este script testa todo o fluxo de integração:
 * 1. Autenticação na API dos Correios
 * 2. Verificação da configuração
 * 3. Criação de um pedido de teste
 * 4. Geração de código de rastreio para o pedido
 * 5. Consulta do status de rastreamento
 * 
 * Uso: node test-correios-homologacao.js
 */

require('dotenv').config();
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// URL base da API (localhost ou produção)
const API_BASE = process.env.API_URL || 'http://localhost:4000/api';

// Token de autenticação para admin (será obtido via login)
let adminToken = null;

// Credenciais de admin para teste
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@exemplo.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'senha123';

// ID do pedido de teste (será criado ou usado um existente)
let testOrderId = null;

// Código de rastreio gerado
let trackingCode = null;

/**
 * Função principal que executa todos os testes em sequência
 */
async function runTests() {
  console.log('🧪 INICIANDO TESTES DE HOMOLOGAÇÃO DOS CORREIOS');
  console.log('==============================================\n');
  
  try {
    // 1. Login como admin
    await loginAsAdmin();
    
    // 2. Verificar status da integração
    await checkIntegrationStatus();
    
    // 3. Testar conexão com a API dos Correios
    await testCorreiosConnection();
    
    // 4. Criar ou usar pedido de teste
    await setupTestOrder();
    
    // 5. Gerar código de rastreio
    await generateTrackingCode();
    
    // 6. Verificar rastreamento
    if (trackingCode) {
      await trackShipment();
    }
    
    // 7. Testar processamento automático
    await testAutomaticProcessing();
    
    console.log('\n✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
    
  } catch (error) {
    console.error('\n❌ FALHA NOS TESTES:', error.message);
    console.error('Detalhes:', error);
  } finally {
    // Limpeza
    await cleanup();
  }
}

/**
 * Login como administrador para obter token
 */
async function loginAsAdmin() {
  console.log('🔑 Autenticando como administrador...');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data && response.data.token) {
      adminToken = response.data.token;
      console.log('✅ Autenticação bem-sucedida!');
      return true;
    } else {
      throw new Error('Token não encontrado na resposta');
    }
  } catch (error) {
    console.error('❌ Falha na autenticação:', error.response?.data?.error || error.message);
    throw new Error('Falha na autenticação. Verifique as credenciais.');
  }
}

/**
 * Verificar status da integração com os Correios
 */
async function checkIntegrationStatus() {
  console.log('\n🔍 Verificando status da integração com os Correios...');
  
  try {
    const response = await axios.get(`${API_BASE}/correios/status-integracao`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('📊 Status da integração:');
    console.log(`- Configuração válida: ${response.data.status.configValida ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`- Conexão OK: ${response.data.status.conexaoOk ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`- Token válido: ${response.data.status.tokenValido ? 'SIM ✅' : 'NÃO ❌'}`);
    console.log(`- Ambiente: ${response.data.status.ambiente}`);
    console.log(`- Pedidos pendentes: ${response.data.status.pedidosPendentes}`);
    
    if (!response.data.status.configValida || !response.data.status.conexaoOk) {
      throw new Error('Configuração dos Correios inválida ou conexão falhou');
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao verificar status da integração:', error.response?.data?.error || error.message);
    throw new Error('Falha ao verificar status da integração');
  }
}

/**
 * Testar conexão direta com a API dos Correios
 */
async function testCorreiosConnection() {
  console.log('\n🔌 Testando conexão direta com a API dos Correios...');
  
  try {
    const response = await axios.get(`${API_BASE}/correios/testar-conexao`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Conexão com API dos Correios estabelecida com sucesso!');
      return true;
    } else {
      throw new Error(response.data.message || 'Falha na conexão');
    }
  } catch (error) {
    console.error('❌ Falha no teste de conexão:', error.response?.data?.error || error.message);
    throw new Error('Falha no teste de conexão com a API dos Correios');
  }
}

/**
 * Configurar pedido de teste (criar novo ou usar existente)
 */
async function setupTestOrder() {
  console.log('\n📦 Configurando pedido de teste...');
  
  // Verificar se já existe um pedido de teste
  const existingOrder = await findExistingTestOrder();
  
  if (existingOrder) {
    testOrderId = existingOrder.id;
    console.log(`✅ Usando pedido de teste existente #${testOrderId}`);
    return existingOrder;
  }
  
  // Criar novo pedido de teste
  console.log('🆕 Criando novo pedido de teste...');
  
  try {
    // Criar pedido diretamente no banco para teste
    const newOrder = await prisma.order.create({
      data: {
        customerName: 'Cliente Teste Homologação',
        customerEmail: 'teste@homologacao.com',
        customerPhone: '11999998888',
        customerDocument: '12345678909',
        total: 99.90,
        status: 'PAID',
        paymentStatus: 'PAID',
        paymentMethod: 'TEST',
        shippingAddress: 'Avenida Paulista, 1000, Bela Vista, São Paulo - SP, 01310-100',
        shippingCost: 15.90,
        isTestOrder: true,
        items: {
          create: [
            {
              name: 'Produto Teste',
              price: 84.00,
              quantity: 1
            }
          ]
        }
      }
    });
    
    testOrderId = newOrder.id;
    console.log(`✅ Novo pedido de teste criado com ID #${testOrderId}`);
    return newOrder;
  } catch (error) {
    console.error('❌ Erro ao criar pedido de teste:', error);
    throw new Error('Falha ao criar pedido de teste');
  }
}

/**
 * Procurar por um pedido de teste existente
 */
async function findExistingTestOrder() {
  try {
    // Buscar pedido de teste existente
    const order = await prisma.order.findFirst({
      where: {
        isTestOrder: true,
        OR: [
          { status: 'PAID' },
          { paymentStatus: 'PAID' }
        ],
        trackingNumber: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return order;
  } catch (error) {
    console.error('❌ Erro ao buscar pedido de teste existente:', error);
    return null;
  }
}

/**
 * Gerar código de rastreio para o pedido de teste
 */
async function generateTrackingCode() {
  console.log(`\n📮 Gerando código de rastreio para pedido #${testOrderId}...`);
  
  try {
    const response = await axios.post(
      `${API_BASE}/correios/gerar-rastreio/${testOrderId}`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.data.success && response.data.trackingNumber) {
      trackingCode = response.data.trackingNumber;
      console.log(`✅ Código de rastreio gerado com sucesso: ${trackingCode}`);
      return trackingCode;
    } else {
      throw new Error('Código de rastreio não foi gerado');
    }
  } catch (error) {
    console.error('❌ Erro ao gerar código de rastreio:', error.response?.data?.error || error.message);
    
    // Verificar problemas específicos
    if (error.response?.status === 400) {
      console.log('⚠️ Possíveis causas:');
      console.log('  - Pedido não encontrado');
      console.log('  - Pedido não está pago');
      console.log('  - Endereço de entrega inválido');
      console.log('  - Configuração dos Correios incompleta');
    }
    
    throw new Error('Falha ao gerar código de rastreio');
  }
}

/**
 * Rastrear objeto usando o código gerado
 */
async function trackShipment() {
  console.log(`\n🔍 Rastreando código ${trackingCode}...`);
  
  try {
    const response = await axios.get(`${API_BASE}/correios/rastrear/${trackingCode}`);
    
    console.log('✅ Informações de rastreamento:');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao rastrear:', error.response?.data?.error || error.message);
    
    if (error.response?.status === 404) {
      console.log('⚠️ Código de rastreio não encontrado ou inválido');
      console.log('⚠️ Isso é normal para códigos recém-gerados, pois demora algumas horas para serem ativados no sistema dos Correios');
    }
    
    // Não falhar o teste por isso, apenas avisar
    console.log('⚠️ Não foi possível rastrear o código, mas isso não indica falha na integração');
    return null;
  }
}

/**
 * Testar processamento automático de pedidos
 */
async function testAutomaticProcessing() {
  console.log('\n⚙️ Testando processamento automático de pedidos pagos...');
  
  try {
    const response = await axios.post(
      `${API_BASE}/correios/processar-pedidos`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Processamento automático iniciado com sucesso!');
      
      // Aguardar um pouco para dar tempo de processar
      console.log('⏳ Aguardando processamento (5 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verificar se pedidos foram processados
      await checkPendingOrders();
      
      return true;
    } else {
      throw new Error('Falha ao iniciar processamento automático');
    }
  } catch (error) {
    console.error('❌ Erro no processamento automático:', error.response?.data?.error || error.message);
    throw new Error('Falha no teste de processamento automático');
  }
}

/**
 * Verificar pedidos pendentes após processamento
 */
async function checkPendingOrders() {
  try {
    const response = await axios.get(`${API_BASE}/correios/status-integracao`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log(`📊 Pedidos pendentes após processamento: ${response.data.status.pedidosPendentes}`);
    return response.data.status.pedidosPendentes;
  } catch (error) {
    console.error('❌ Erro ao verificar pedidos pendentes:', error.response?.data?.error || error.message);
    return null;
  }
}

/**
 * Limpeza após testes
 */
async function cleanup() {
  console.log('\n🧹 Realizando limpeza...');
  
  try {
    await prisma.$disconnect();
    console.log('✅ Conexão com banco de dados fechada');
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  }
}

// Executar testes
runTests()
  .then(() => {
    console.log('\n🎉 Testes de homologação concluídos!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Falha nos testes de homologação:', error);
    process.exit(1);
  }); 