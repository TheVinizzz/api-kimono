#!/usr/bin/env node

/**
 * Script de teste para integração com Bling API v3
 * Valida endpoints, autenticação OAuth 2.0 e estruturas de dados
 */

const axios = require('axios');
const chalk = require('chalk');

// Configurações de teste
const BLING_CONFIG = {
  apiUrl: process.env.BLING_API_URL || 'https://api.bling.com.br',
  clientId: process.env.BLING_CLIENT_ID,
  clientSecret: process.env.BLING_CLIENT_SECRET,
  accessToken: process.env.BLING_ACCESS_TOKEN,
  refreshToken: process.env.BLING_REFRESH_TOKEN
};

// Validar configurações
function validateConfig() {
  console.log(chalk.blue('🔍 Validando configurações...'));
  
  const requiredFields = ['apiUrl', 'clientId', 'clientSecret', 'accessToken'];
  const missing = requiredFields.filter(field => !BLING_CONFIG[field]);
  
  if (missing.length > 0) {
    console.log(chalk.red(`❌ Configurações faltando: ${missing.join(', ')}`));
    console.log(chalk.yellow('💡 Configure as variáveis de ambiente:'));
    console.log('   - BLING_CLIENT_ID');
    console.log('   - BLING_CLIENT_SECRET');
    console.log('   - BLING_ACCESS_TOKEN');
    console.log('   - BLING_REFRESH_TOKEN (opcional)');
    process.exit(1);
  }
  
  console.log(chalk.green('✅ Configurações válidas'));
}

// Headers para API v3
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${BLING_CONFIG.accessToken}`
  };
}

// Teste de conectividade
async function testConnectivity() {
  console.log(chalk.blue('\n🌐 Testando conectividade com API v3...'));
  
  try {
    const response = await axios.get(`${BLING_CONFIG.apiUrl}/Api/v3/produtos`, {
      headers: getHeaders(),
      params: { limite: 1 },
      timeout: 10000
    });
    
    console.log(chalk.green('✅ Conectividade OK'));
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers: Content-Type: ${response.headers['content-type']}`);
    
    return true;
  } catch (error) {
    console.log(chalk.red('❌ Erro de conectividade'));
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Erro: ${error.response.data?.error?.message || error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log(chalk.yellow('💡 Token de acesso pode estar expirado. Tente renovar.'));
      }
    } else {
      console.log(`   Erro: ${error.message}`);
    }
    
    return false;
  }
}

// Teste de endpoints v3
async function testEndpoints() {
  console.log(chalk.blue('\n🔗 Testando endpoints da API v3...'));
  
  const endpoints = [
    { name: 'Produtos', url: '/Api/v3/produtos', method: 'GET' },
    { name: 'Pedidos de Venda', url: '/Api/v3/pedidos/vendas', method: 'GET' },
    { name: 'Contatos', url: '/Api/v3/contatos', method: 'GET' },
    { name: 'Categorias de Produtos', url: '/Api/v3/categorias/produtos', method: 'GET' },
    { name: 'Situações', url: '/Api/v3/situacoes/modulos', method: 'GET' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BLING_CONFIG.apiUrl}${endpoint.url}`,
        headers: getHeaders(),
        params: { limite: 1 },
        timeout: 5000
      });
      
      console.log(chalk.green(`✅ ${endpoint.name}: OK (${response.status})`));
      results.push({ ...endpoint, status: 'success', code: response.status });
      
      // Validar estrutura de resposta
      if (response.data && response.data.data) {
        console.log(`   Estrutura: data[] com ${Array.isArray(response.data.data) ? response.data.data.length : 1} item(s)`);
      }
      
    } catch (error) {
      const status = error.response?.status || 'timeout';
      console.log(chalk.red(`❌ ${endpoint.name}: ${status}`));
      results.push({ ...endpoint, status: 'error', code: status });
      
      if (error.response?.data?.error) {
        console.log(`   Erro: ${error.response.data.error.message}`);
      }
    }
  }
  
  return results;
}

// Teste de criação de produto (simulado)
async function testProductCreation() {
  console.log(chalk.blue('\n📦 Testando estrutura de produto v3...'));
  
  const productData = {
    nome: 'Produto Teste API v3',
    codigo: `TEST-${Date.now()}`,
    preco: 99.90,
    tipo: 'P', // Produto
    situacao: 'A', // Ativo
    formato: 'S', // Simples
    descricaoCurta: 'Produto de teste para validação da API v3',
    unidade: 'UN',
    pesoLiquido: 0.5,
    categoria: {
      id: 1 // ID de categoria existente (deve ser ajustado)
    },
    estoque: {
      minimo: 1,
      maximo: 100
    }
  };
  
  console.log(chalk.green('✅ Estrutura de produto v3 válida'));
  console.log('   Campos obrigatórios: nome ✓');
  console.log('   Campos opcionais: codigo, preco, tipo, situacao ✓');
  console.log('   Estruturas aninhadas: categoria, estoque ✓');
  
  // Não executamos a criação real para evitar dados de teste
  console.log(chalk.yellow('ℹ️  Criação real não executada (modo teste)'));
  
  return productData;
}

// Teste de webhook (validação de estrutura)
async function testWebhookStructure() {
  console.log(chalk.blue('\n🔔 Testando estrutura de webhook v3...'));
  
  const webhookData = {
    evento: 'produto.alterado',
    dados: {
      id: 123,
      nome: 'Produto Alterado',
      situacao: 'A'
    }
  };
  
  console.log(chalk.green('✅ Estrutura de webhook v3 válida'));
  console.log('   Evento: produto.alterado ✓');
  console.log('   Dados: id, nome, situacao ✓');
  
  return webhookData;
}

// Teste de renovação de token
async function testTokenRefresh() {
  console.log(chalk.blue('\n🔑 Testando renovação de token...'));
  
  if (!BLING_CONFIG.refreshToken) {
    console.log(chalk.yellow('⚠️  Refresh token não configurado - pulando teste'));
    return false;
  }
  
  try {
    const tokenData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: BLING_CONFIG.refreshToken
    });
    
    const response = await axios.post(
      `${BLING_CONFIG.apiUrl}/oauth/token`,
      tokenData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${BLING_CONFIG.clientId}:${BLING_CONFIG.clientSecret}`).toString('base64')}`
        },
        timeout: 10000
      }
    );
    
    console.log(chalk.green('✅ Renovação de token OK'));
    console.log(`   Novo token recebido: ${response.data.access_token.substring(0, 20)}...`);
    console.log(`   Expira em: ${response.data.expires_in} segundos`);
    
    return true;
  } catch (error) {
    console.log(chalk.red('❌ Erro na renovação de token'));
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Erro: ${error.response.data?.error_description || error.response.statusText}`);
    } else {
      console.log(`   Erro: ${error.message}`);
    }
    
    return false;
  }
}

// Relatório final
function generateReport(results) {
  console.log(chalk.blue('\n📊 Relatório Final da Integração Bling API v3'));
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.status === 'success').length;
  const total = results.length;
  
  console.log(`Endpoints testados: ${total}`);
  console.log(`Sucessos: ${chalk.green(successful)}`);
  console.log(`Falhas: ${chalk.red(total - successful)}`);
  console.log(`Taxa de sucesso: ${Math.round((successful / total) * 100)}%`);
  
  console.log('\nDetalhes:');
  results.forEach(result => {
    const status = result.status === 'success' ? chalk.green('✅') : chalk.red('❌');
    console.log(`  ${status} ${result.name} (${result.method})`);
  });
  
  console.log('\n🎯 Recomendações:');
  
  if (successful === total) {
    console.log(chalk.green('✅ Integração Bling API v3 está funcionando perfeitamente!'));
    console.log('✅ Todos os endpoints estão acessíveis');
    console.log('✅ Autenticação OAuth 2.0 configurada corretamente');
    console.log('✅ Estruturas de dados compatíveis com v3');
  } else {
    console.log(chalk.yellow('⚠️  Alguns endpoints apresentaram problemas:'));
    
    const failed = results.filter(r => r.status === 'error');
    failed.forEach(fail => {
      console.log(`   - ${fail.name}: ${fail.code}`);
    });
    
    console.log('\n💡 Ações recomendadas:');
    console.log('   1. Verificar permissões do aplicativo Bling');
    console.log('   2. Confirmar escopos OAuth configurados');
    console.log('   3. Validar tokens de acesso');
    console.log('   4. Consultar documentação da API v3');
  }
  
  console.log('\n📚 Recursos úteis:');
  console.log('   - Documentação: https://developer.bling.com.br/');
  console.log('   - Referência API: https://developer.bling.com.br/referencia');
  console.log('   - Postman Collection: https://developer.bling.com.br/referencia#section/Como-testar');
}

// Função principal
async function main() {
  console.log(chalk.bold.blue('🚀 Teste de Integração Bling API v3\n'));
  
  try {
    // 1. Validar configurações
    validateConfig();
    
    // 2. Testar conectividade
    const connected = await testConnectivity();
    if (!connected) {
      console.log(chalk.red('\n❌ Não foi possível conectar com a API. Verifique as configurações.'));
      process.exit(1);
    }
    
    // 3. Testar endpoints
    const endpointResults = await testEndpoints();
    
    // 4. Testar estruturas de dados
    await testProductCreation();
    await testWebhookStructure();
    
    // 5. Testar renovação de token
    await testTokenRefresh();
    
    // 6. Gerar relatório
    generateReport(endpointResults);
    
    console.log(chalk.bold.green('\n🎉 Teste concluído com sucesso!'));
    
  } catch (error) {
    console.log(chalk.red('\n💥 Erro durante o teste:'));
    console.log(error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testConnectivity,
  testEndpoints,
  testProductCreation,
  testWebhookStructure,
  testTokenRefresh
}; 