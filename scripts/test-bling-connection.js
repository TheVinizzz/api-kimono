#!/usr/bin/env node

/**
 * Script para testar conexão e visualizar dados do Bling
 * Permite verificar se a integração está funcionando antes de sincronizar
 */

require('dotenv').config();
const axios = require('axios');

class BlingConnectionTest {
  constructor() {
    this.apiUrl = process.env.BLING_API_URL || 'https://www.bling.com.br/Api/v3';
    this.accessToken = process.env.BLING_ACCESS_TOKEN;
    this.clientId = process.env.BLING_CLIENT_ID;
    this.clientSecret = process.env.BLING_CLIENT_SECRET;
    this.refreshToken = process.env.BLING_REFRESH_TOKEN;
  }

  // Validar configuração
  validateConfig() {
    const issues = [];
    
    if (!this.clientId) issues.push('BLING_CLIENT_ID não encontrado');
    if (!this.clientSecret) issues.push('BLING_CLIENT_SECRET não encontrado');
    if (!this.accessToken) issues.push('BLING_ACCESS_TOKEN não encontrado');
    
    if (issues.length > 0) {
      console.error('❌ PROBLEMAS DE CONFIGURAÇÃO:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\n💡 Execute primeiro: node scripts/bling-oauth-setup.js');
      return false;
    }
    
    console.log('✅ Configuração OAuth validada');
    console.log(`📋 Client ID: ${this.clientId.substring(0, 8)}...`);
    console.log(`🔑 Access Token: ${this.accessToken.substring(0, 20)}...`);
    return true;
  }

  // Headers para requisições
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Fazer requisição com tratamento de erro
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const config = {
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: this.getHeaders()
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      return { success: true, data: response.data };
      
    } catch (error) {
      if (error.response?.status === 401) {
        return { 
          success: false, 
          error: 'Token expirado ou inválido',
          suggestion: 'Execute: node scripts/bling-oauth-setup.js'
        };
      }
      
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message,
        status: error.response?.status
      };
    }
  }

  // Testar conexão básica
  async testConnection() {
    console.log('\n🔍 TESTANDO CONEXÃO COM BLING');
    console.log('==============================');
    
    const result = await this.makeRequest('/situacao');
    
    if (result.success) {
      console.log('✅ Conexão estabelecida com sucesso!');
      console.log(`📊 Status da API: ${result.data?.retorno || 'OK'}`);
      return true;
    } else {
      console.log('❌ Falha na conexão:');
      console.log(`   Erro: ${result.error}`);
      if (result.suggestion) {
        console.log(`   💡 Solução: ${result.suggestion}`);
      }
      return false;
    }
  }

  // Listar produtos do Bling
  async listProducts(limit = 10) {
    console.log('\n📦 PRODUTOS NO BLING');
    console.log('====================');
    
    const result = await this.makeRequest(`/produtos?limite=${limit}`);
    
    if (result.success) {
      const products = result.data?.data || [];
      
      if (products.length === 0) {
        console.log('📭 Nenhum produto encontrado no Bling');
        return [];
      }
      
      console.log(`📋 ${products.length} produtos encontrados:\n`);
      
      products.forEach((product, index) => {
        console.log(`${index + 1}. 📦 ${product.nome || 'Sem nome'}`);
        console.log(`   🆔 ID: ${product.id}`);
        console.log(`   💰 Preço: R$ ${product.preco || '0,00'}`);
        console.log(`   📊 Situação: ${product.situacao || 'N/A'}`);
        console.log(`   📅 Criado: ${product.dataCriacao || 'N/A'}`);
        console.log('');
      });
      
      return products;
    } else {
      console.log('❌ Erro ao buscar produtos:');
      console.log(`   ${result.error}`);
      return [];
    }
  }

  // Verificar estoque de produtos
  async checkStock(productId) {
    console.log(`\n📊 VERIFICANDO ESTOQUE - Produto ID: ${productId}`);
    console.log('===============================================');
    
    const result = await this.makeRequest(`/estoques/${productId}`);
    
    if (result.success) {
      const stock = result.data?.data || {};
      
      console.log('✅ Informações de estoque:');
      console.log(`   📦 Saldo Físico: ${stock.saldoFisico || 0}`);
      console.log(`   🔒 Saldo Reservado: ${stock.saldoReservado || 0}`);
      console.log(`   ✅ Saldo Disponível: ${stock.saldoDisponivel || 0}`);
      console.log(`   💰 Custo Médio: R$ ${stock.custoMedio || '0,00'}`);
      
      return stock;
    } else {
      console.log('❌ Erro ao verificar estoque:');
      console.log(`   ${result.error}`);
      return null;
    }
  }

  // Listar categorias
  async listCategories() {
    console.log('\n🏷️  CATEGORIAS NO BLING');
    console.log('=======================');
    
    const result = await this.makeRequest('/categorias/produtos');
    
    if (result.success) {
      const categories = result.data?.data || [];
      
      if (categories.length === 0) {
        console.log('📭 Nenhuma categoria encontrada');
        return [];
      }
      
      console.log(`📋 ${categories.length} categorias encontradas:\n`);
      
      categories.forEach((category, index) => {
        console.log(`${index + 1}. 🏷️  ${category.nome || 'Sem nome'}`);
        console.log(`   🆔 ID: ${category.id}`);
        console.log(`   📝 Descrição: ${category.descricao || 'N/A'}`);
        console.log('');
      });
      
      return categories;
    } else {
      console.log('❌ Erro ao buscar categorias:');
      console.log(`   ${result.error}`);
      return [];
    }
  }

  // Verificar pedidos recentes
  async listRecentOrders(limit = 5) {
    console.log('\n🛒 PEDIDOS RECENTES NO BLING');
    console.log('============================');
    
    const result = await this.makeRequest(`/pedidos/vendas?limite=${limit}`);
    
    if (result.success) {
      const orders = result.data?.data || [];
      
      if (orders.length === 0) {
        console.log('📭 Nenhum pedido encontrado');
        return [];
      }
      
      console.log(`📋 ${orders.length} pedidos encontrados:\n`);
      
      orders.forEach((order, index) => {
        console.log(`${index + 1}. 🛒 Pedido #${order.numero || order.id}`);
        console.log(`   🆔 ID: ${order.id}`);
        console.log(`   💰 Valor: R$ ${order.total || '0,00'}`);
        console.log(`   📊 Situação: ${order.situacao?.nome || 'N/A'}`);
        console.log(`   📅 Data: ${order.data || 'N/A'}`);
        console.log(`   👤 Cliente: ${order.contato?.nome || 'N/A'}`);
        console.log('');
      });
      
      return orders;
    } else {
      console.log('❌ Erro ao buscar pedidos:');
      console.log(`   ${result.error}`);
      return [];
    }
  }

  // Verificar informações da conta
  async getAccountInfo() {
    console.log('\n👤 INFORMAÇÕES DA CONTA');
    console.log('=======================');
    
    const result = await this.makeRequest('/me');
    
    if (result.success) {
      const account = result.data?.data || {};
      
      console.log('✅ Informações da conta:');
      console.log(`   🏢 Empresa: ${account.nome || 'N/A'}`);
      console.log(`   📧 Email: ${account.email || 'N/A'}`);
      console.log(`   📱 Telefone: ${account.telefone || 'N/A'}`);
      console.log(`   🆔 ID: ${account.id || 'N/A'}`);
      console.log(`   💼 Plano: ${account.plano || 'N/A'}`);
      
      return account;
    } else {
      console.log('❌ Erro ao buscar informações da conta:');
      console.log(`   ${result.error}`);
      return null;
    }
  }

  // Executar todos os testes
  async runAllTests() {
    console.log('🚀 INICIANDO TESTES DE CONEXÃO COM BLING');
    console.log('=========================================');
    
    // Validar configuração
    if (!this.validateConfig()) {
      process.exit(1);
    }
    
    // Testar conexão
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      console.log('\n❌ Não foi possível estabelecer conexão com o Bling');
      process.exit(1);
    }
    
    // Verificar informações da conta
    await this.getAccountInfo();
    
    // Listar categorias
    const categories = await this.listCategories();
    
    // Listar produtos
    const products = await this.listProducts();
    
    // Verificar estoque do primeiro produto (se existir)
    if (products.length > 0 && products[0].id) {
      await this.checkStock(products[0].id);
    }
    
    // Listar pedidos recentes
    await this.listRecentOrders();
    
    // Resumo final
    console.log('\n📊 RESUMO DOS TESTES');
    console.log('====================');
    console.log(`✅ Conexão: OK`);
    console.log(`📦 Produtos encontrados: ${products.length}`);
    console.log(`🏷️  Categorias encontradas: ${categories.length}`);
    console.log(`🔑 API funcionando corretamente`);
    
    console.log('\n🎉 TESTES CONCLUÍDOS COM SUCESSO!');
    console.log('💡 Agora você pode executar a sincronização com segurança.');
    console.log('   Execute: node scripts/sync-bling-stock.js');
  }

  // Executar teste específico
  async runSpecificTest(testType) {
    if (!this.validateConfig()) {
      process.exit(1);
    }
    
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      process.exit(1);
    }
    
    switch (testType) {
      case 'products':
        await this.listProducts(20);
        break;
      case 'categories':
        await this.listCategories();
        break;
      case 'orders':
        await this.listRecentOrders(10);
        break;
      case 'account':
        await this.getAccountInfo();
        break;
      case 'stock':
        console.log('💡 Para verificar estoque, forneça o ID do produto:');
        console.log('   node scripts/test-bling-connection.js stock <product_id>');
        break;
      default:
        console.log('❌ Teste não reconhecido. Opções disponíveis:');
        console.log('   - products: Listar produtos');
        console.log('   - categories: Listar categorias');
        console.log('   - orders: Listar pedidos');
        console.log('   - account: Informações da conta');
        console.log('   - stock <id>: Verificar estoque de produto');
    }
  }
}

// Executar script
if (require.main === module) {
  const tester = new BlingConnectionTest();
  const command = process.argv[2];
  const param = process.argv[3];
  
  if (!command) {
    // Executar todos os testes
    tester.runAllTests().catch(error => {
      console.error('❌ Erro fatal:', error.message);
      process.exit(1);
    });
  } else if (command === 'stock' && param) {
    // Verificar estoque específico
    tester.validateConfig() && 
    tester.testConnection().then(ok => {
      if (ok) return tester.checkStock(param);
    }).catch(error => {
      console.error('❌ Erro:', error.message);
    });
  } else {
    // Executar teste específico
    tester.runSpecificTest(command).catch(error => {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    });
  }
}

module.exports = BlingConnectionTest; 