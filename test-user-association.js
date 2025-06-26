const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para fazer login e obter token
async function loginUser(email, password) {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.token) {
      console.log('✅ Login realizado com sucesso!');
      console.log('👤 Usuário:', response.data.user);
      return {
        token: response.data.token,
        user: response.data.user
      };
    } else {
      throw new Error('Token não retornado');
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    throw error;
  }
}

// Função para criar um usuário de teste
async function createTestUser() {
  try {
    const testUser = {
      name: 'Teste Associação',
      email: `teste.associacao.${Date.now()}@test.com`,
      password: '123456',
      cpfCnpj: '12345678901'
    };

    console.log('👤 Criando usuário de teste:', testUser.email);
    
    const response = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
    
    if (response.data.success) {
      console.log('✅ Usuário criado com sucesso!');
      return testUser;
    } else {
      throw new Error('Falha ao criar usuário');
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.response?.data || error.message);
    throw error;
  }
}

// Função para processar pagamento
async function processPayment(token, userEmail) {
  try {
    console.log('💳 Processando pagamento com usuário autenticado...');
    
    const paymentData = {
      orderData: {
        email: userEmail, // Email do usuário logado
        cpfCnpj: '12345678901',
        total: 150.00,
        items: [
          {
            productId: 1,
            name: 'Produto Teste Associação',
            quantity: 1,
            price: 150.00
          }
        ],
        address: {
          name: 'Teste Associação',
          street: 'Rua Teste, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567'
        }
      },
      cardData: {
        holderName: 'TESTE ASSOCIACAO',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      },
      paymentMethod: 'CREDIT_CARD'
    };

    const response = await axios.post(`${API_BASE_URL}/payment/card`, paymentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Pagamento processado!');
    console.log('📦 Resposta:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Erro no pagamento:', error.response?.data || error.message);
    throw error;
  }
}

// Função para verificar o pedido no banco
async function checkOrderInDatabase(orderId) {
  try {
    console.log('🔍 Verificando pedido no banco de dados...');
    
    // Simulando consulta direta ao banco (você pode ajustar conforme sua API)
    const response = await axios.get(`${API_BASE_URL}/admin/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}` // Assumindo que você tem um token admin
      }
    });
    
    console.log('📊 Dados do pedido no banco:', response.data);
    return response.data;
  } catch (error) {
    console.log('⚠️ Não foi possível verificar diretamente no banco via API');
    return null;
  }
}

// Função principal de teste
async function testUserAssociation() {
  console.log('🧪 === TESTE DE ASSOCIAÇÃO DE USUÁRIOS ===\n');
  
  try {
    // 1. Criar usuário de teste
    const testUser = await createTestUser();
    console.log('');
    
    // 2. Fazer login
    const loginData = await loginUser(testUser.email, testUser.password);
    console.log('');
    
    // 3. Processar pagamento
    const paymentResult = await processPayment(loginData.token, testUser.email);
    console.log('');
    
    // 4. Verificar resultados
    console.log('🔍 === VERIFICAÇÃO DE RESULTADOS ===');
    console.log('✅ Pedido ID:', paymentResult.orderId);
    console.log('✅ Payment ID:', paymentResult.paymentId);
    console.log('✅ Status:', paymentResult.status);
    console.log('✅ Tipo de usuário:', paymentResult.userType);
    console.log('✅ User ID:', paymentResult.userId);
    console.log('✅ Email do usuário:', paymentResult.userEmail);
    console.log('✅ Usuário associado:', paymentResult.userAssociated);
    console.log('✅ ID do usuário associado:', paymentResult.associatedUserId);
    
    // 5. Validações
    console.log('\n🧪 === VALIDAÇÕES ===');
    
    if (paymentResult.userType === 'authenticated') {
      console.log('✅ PASSOU: Tipo de usuário correto (authenticated)');
    } else {
      console.log('❌ FALHOU: Tipo de usuário incorreto:', paymentResult.userType);
    }
    
    if (paymentResult.userId === loginData.user.id) {
      console.log('✅ PASSOU: User ID correto na resposta');
    } else {
      console.log('❌ FALHOU: User ID incorreto na resposta');
    }
    
    if (paymentResult.userAssociated === true) {
      console.log('✅ PASSOU: Usuário foi associado');
    } else {
      console.log('❌ FALHOU: Usuário não foi associado');
    }
    
    if (paymentResult.associatedUserId === loginData.user.id) {
      console.log('✅ PASSOU: ID do usuário associado está correto');
    } else {
      console.log('❌ FALHOU: ID do usuário associado está incorreto');
    }
    
    if (paymentResult.userEmail === testUser.email) {
      console.log('✅ PASSOU: Email do usuário correto');
    } else {
      console.log('❌ FALHOU: Email do usuário incorreto');
    }
    
    console.log('\n🎉 === TESTE CONCLUÍDO ===');
    console.log('📝 Verifique no banco de dados se o pedido', paymentResult.orderId, 'tem userId preenchido!');
    
  } catch (error) {
    console.error('\n❌ === TESTE FALHOU ===');
    console.error('Erro:', error.message);
  }
}

// Executar teste
testUserAssociation(); 