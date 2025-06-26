const { 
  makeAuthenticatedRequest, 
  getCompanyInfo, 
  getProducts, 
  getCategories, 
  getOrders,
  loadTokens,
  isTokenExpired 
} = require('./bling-oauth-complete');

// ==========================================
// FUNÇÕES DE TESTE AVANÇADAS
// ==========================================

// Obter informações detalhadas da empresa
async function getDetailedCompanyInfo() {
  console.log('\n🏢 === INFORMAÇÕES DETALHADAS DA EMPRESA ===');
  
  const response = await makeAuthenticatedRequest('/empresas');
  
  if (response && response.statusCode === 200) {
    const companies = response.data.data || response.data;
    
    if (Array.isArray(companies) && companies.length > 0) {
      const company = companies[0];
      
      console.log('✅ Empresa encontrada:');
      console.log(`   📛 Nome: ${company.nome || 'N/A'}`);
      console.log(`   🆔 ID: ${company.id || 'N/A'}`);
      console.log(`   📧 Email: ${company.email || 'N/A'}`);
      console.log(`   📞 Telefone: ${company.telefone || 'N/A'}`);
      console.log(`   🏠 Endereço: ${company.endereco?.logradouro || 'N/A'}`);
      console.log(`   🏙️  Cidade: ${company.endereco?.cidade || 'N/A'}`);
      console.log(`   🗺️  UF: ${company.endereco?.uf || 'N/A'}`);
      console.log(`   📮 CEP: ${company.endereco?.cep || 'N/A'}`);
      
      return company;
    } else {
      console.log('⚠️  Nenhuma empresa encontrada');
    }
  } else {
    console.error('❌ Erro ao obter informações da empresa:', response?.statusCode, response?.data);
  }
  
  return null;
}

// Obter produtos com detalhes
async function getDetailedProducts(limit = 20) {
  console.log(`\n📦 === PRODUTOS DETALHADOS (Limite: ${limit}) ===`);
  
  const response = await makeAuthenticatedRequest(`/produtos?limite=${limit}&pagina=1`);
  
  if (response && response.statusCode === 200) {
    const products = response.data.data || response.data;
    
    if (Array.isArray(products) && products.length > 0) {
      console.log(`✅ ${products.length} produtos encontrados:`);
      
      products.forEach((product, index) => {
        console.log(`\n   ${index + 1}. 📦 ${product.nome || 'Sem nome'}`);
        console.log(`      🆔 ID: ${product.id || 'N/A'}`);
        console.log(`      🏷️  SKU: ${product.codigo || 'N/A'}`);
        console.log(`      💰 Preço: R$ ${product.preco || 'N/A'}`);
        console.log(`      📊 Estoque: ${product.estoques?.[0]?.saldoFisico || 'N/A'}`);
        console.log(`      📂 Categoria: ${product.categoria?.descricao || 'N/A'}`);
        console.log(`      ✅ Ativo: ${product.situacao === 'Ativo' ? 'Sim' : 'Não'}`);
        
        if (product.imagemURL) {
          console.log(`      🖼️  Imagem: ${product.imagemURL}`);
        }
      });
      
      return products;
    } else {
      console.log('⚠️  Nenhum produto encontrado');
    }
  } else {
    console.error('❌ Erro ao obter produtos:', response?.statusCode, response?.data);
  }
  
  return [];
}

// Obter categorias com detalhes
async function getDetailedCategories() {
  console.log('\n📂 === CATEGORIAS DETALHADAS ===');
  
  const response = await makeAuthenticatedRequest('/categorias');
  
  if (response && response.statusCode === 200) {
    const categories = response.data.data || response.data;
    
    if (Array.isArray(categories) && categories.length > 0) {
      console.log(`✅ ${categories.length} categorias encontradas:`);
      
      categories.forEach((category, index) => {
        console.log(`\n   ${index + 1}. 📂 ${category.descricao || 'Sem nome'}`);
        console.log(`      🆔 ID: ${category.id || 'N/A'}`);
        console.log(`      👥 Categoria Pai: ${category.categoriaPai?.descricao || 'Categoria raiz'}`);
      });
      
      return categories;
    } else {
      console.log('⚠️  Nenhuma categoria encontrada');
    }
  } else {
    console.error('❌ Erro ao obter categorias:', response?.statusCode, response?.data);
  }
  
  return [];
}

// Obter pedidos com detalhes
async function getDetailedOrders(limit = 10) {
  console.log(`\n📋 === PEDIDOS DETALHADOS (Limite: ${limit}) ===`);
  
  const response = await makeAuthenticatedRequest(`/pedidos/vendas?limite=${limit}&pagina=1`);
  
  if (response && response.statusCode === 200) {
    const orders = response.data.data || response.data;
    
    if (Array.isArray(orders) && orders.length > 0) {
      console.log(`✅ ${orders.length} pedidos encontrados:`);
      
      orders.forEach((order, index) => {
        console.log(`\n   ${index + 1}. 📋 Pedido #${order.numero || order.id}`);
        console.log(`      🆔 ID: ${order.id || 'N/A'}`);
        console.log(`      📅 Data: ${order.data || 'N/A'}`);
        console.log(`      👤 Cliente: ${order.contato?.nome || 'N/A'}`);
        console.log(`      💰 Total: R$ ${order.total || 'N/A'}`);
        console.log(`      📊 Situação: ${order.situacao?.valor || 'N/A'}`);
        
        if (order.itens && order.itens.length > 0) {
          console.log(`      📦 Itens (${order.itens.length}):`);
          order.itens.forEach((item, itemIndex) => {
            console.log(`         ${itemIndex + 1}. ${item.produto?.nome || 'N/A'} - Qtd: ${item.quantidade || 'N/A'}`);
          });
        }
      });
      
      return orders;
    } else {
      console.log('⚠️  Nenhum pedido encontrado');
    }
  } else {
    console.error('❌ Erro ao obter pedidos:', response?.statusCode, response?.data);
  }
  
  return [];
}

// Obter contatos/clientes
async function getContacts(limit = 10) {
  console.log(`\n👥 === CONTATOS/CLIENTES (Limite: ${limit}) ===`);
  
  const response = await makeAuthenticatedRequest(`/contatos?limite=${limit}&pagina=1`);
  
  if (response && response.statusCode === 200) {
    const contacts = response.data.data || response.data;
    
    if (Array.isArray(contacts) && contacts.length > 0) {
      console.log(`✅ ${contacts.length} contatos encontrados:`);
      
      contacts.forEach((contact, index) => {
        console.log(`\n   ${index + 1}. 👤 ${contact.nome || 'Sem nome'}`);
        console.log(`      🆔 ID: ${contact.id || 'N/A'}`);
        console.log(`      📧 Email: ${contact.email || 'N/A'}`);
        console.log(`      📞 Telefone: ${contact.telefone || 'N/A'}`);
        console.log(`      🏠 Cidade: ${contact.endereco?.cidade || 'N/A'}`);
        console.log(`      📄 CPF/CNPJ: ${contact.numeroDocumento || 'N/A'}`);
        console.log(`      🏷️  Tipo: ${contact.tipo || 'N/A'}`);
      });
      
      return contacts;
    } else {
      console.log('⚠️  Nenhum contato encontrado');
    }
  } else {
    console.error('❌ Erro ao obter contatos:', response?.statusCode, response?.data);
  }
  
  return [];
}

// Obter estoque
async function getStock() {
  console.log('\n📊 === INFORMAÇÕES DE ESTOQUE ===');
  
  const response = await makeAuthenticatedRequest('/estoques');
  
  if (response && response.statusCode === 200) {
    const stocks = response.data.data || response.data;
    
    if (Array.isArray(stocks) && stocks.length > 0) {
      console.log(`✅ ${stocks.length} itens de estoque encontrados:`);
      
      stocks.forEach((stock, index) => {
        console.log(`\n   ${index + 1}. 📦 ${stock.produto?.nome || 'Produto N/A'}`);
        console.log(`      🆔 Produto ID: ${stock.produto?.id || 'N/A'}`);
        console.log(`      📊 Saldo Físico: ${stock.saldoFisico || 'N/A'}`);
        console.log(`      📊 Saldo Virtual: ${stock.saldoVirtual || 'N/A'}`);
        console.log(`      🏪 Depósito: ${stock.deposito?.descricao || 'N/A'}`);
      });
      
      return stocks;
    } else {
      console.log('⚠️  Nenhum item de estoque encontrado');
    }
  } else {
    console.error('❌ Erro ao obter estoque:', response?.statusCode, response?.data);
  }
  
  return [];
}

// Função principal de teste
async function testAllBlingData() {
  console.log('\n🔍 === TESTE COMPLETO DOS DADOS REAIS DO BLING ===');
  console.log('='.repeat(60));
  
  // Verificar se temos tokens válidos
  const tokens = loadTokens();
  if (!tokens) {
    console.error('❌ Nenhum token encontrado!');
    console.log('🔧 Execute primeiro: node bling-oauth-complete.js');
    return;
  }
  
  if (isTokenExpired(tokens)) {
    console.error('❌ Token expirado!');
    console.log('🔧 Execute primeiro: node bling-oauth-complete.js');
    return;
  }
  
  console.log('✅ Tokens válidos encontrados. Iniciando testes...\n');
  
  try {
    // Testar cada endpoint
    const company = await getDetailedCompanyInfo();
    const products = await getDetailedProducts(10);
    const categories = await getDetailedCategories();
    const orders = await getDetailedOrders(5);
    const contacts = await getContacts(5);
    const stock = await getStock();
    
    // Resumo final
    console.log('\n📊 === RESUMO DOS DADOS ===');
    console.log('='.repeat(40));
    console.log(`🏢 Empresa: ${company ? '✅ Configurada' : '❌ Não encontrada'}`);
    console.log(`📦 Produtos: ${products.length} encontrados`);
    console.log(`📂 Categorias: ${categories.length} encontradas`);
    console.log(`📋 Pedidos: ${orders.length} encontrados`);
    console.log(`👥 Contatos: ${contacts.length} encontrados`);
    console.log(`📊 Estoque: ${stock.length} itens encontrados`);
    
    console.log('\n✨ Teste concluído com sucesso!');
    console.log('🔧 Agora você pode usar estes dados para sincronização.');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testAllBlingData().catch(console.error);
}

module.exports = {
  getDetailedCompanyInfo,
  getDetailedProducts,
  getDetailedCategories,
  getDetailedOrders,
  getContacts,
  getStock,
  testAllBlingData
}; 