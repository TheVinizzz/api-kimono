const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Função para criar usuário e fazer pagamento completo
async function testCompleteCheckoutFlow() {
  console.log('🧪 === TESTE COMPLETO DE CHECKOUT E CONFIRMAÇÃO ===\n');

  try {
    // 1. Criar usuário
    const testUser = {
      name: 'Teste Checkout Completo',
      email: `checkout.${Date.now()}@test.com`,
      password: '123456',
      cpfCnpj: '12345678901'
    };

    console.log('👤 1. Criando usuário:', testUser.email);
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);
    console.log('✅ Usuário criado com sucesso!');

    // 2. Fazer login
    console.log('\n🔐 2. Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    const { token, user } = loginResponse.data;
    console.log('✅ Login realizado com sucesso!');
    console.log('👤 Usuário logado:', user);

    // 3. Simular checkout com pagamento
    console.log('\n💳 3. Processando pagamento...');
    const paymentData = {
      orderData: {
        email: user.email,
        cpfCnpj: '12345678901',
        total: 299.90,
        items: [
          {
            productId: 1,
            name: 'Produto Teste Checkout',
            quantity: 2,
            price: 149.95
          }
        ],
        address: {
          name: 'Teste Checkout',
          street: 'Rua do Teste, 123',
          number: '123',
          complement: 'Apto 45',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567'
        }
      },
      cardData: {
        holderName: 'TESTE CHECKOUT',
        cardNumber: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123'
      },
      paymentMethod: 'CREDIT_CARD'
    };

    const paymentResponse = await axios.post(`${API_BASE_URL}/payment/card`, paymentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentResult = paymentResponse.data;
    console.log('✅ Pagamento processado com sucesso!');
    console.log('📦 Resultado:', {
      orderId: paymentResult.orderId,
      paymentId: paymentResult.paymentId,
      status: paymentResult.status,
      userType: paymentResult.userType,
      userAssociated: paymentResult.userAssociated,
      userId: paymentResult.userId
    });

    // 4. Verificar se o pedido foi criado corretamente
    console.log('\n🔍 4. Verificando pedido criado...');
    
    // Simular busca do pedido (como faria o frontend)
    try {
      const orderResponse = await axios.get(`${API_BASE_URL}/orders/${paymentResult.orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const order = orderResponse.data;
      console.log('✅ Pedido encontrado via API autenticada:', {
        id: order.id,
        userId: order.userId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total
      });
    } catch (authError) {
      console.log('⚠️ API autenticada falhou, tentando guest...');
      
      // Fallback para API guest
      const guestResponse = await axios.get(`${API_BASE_URL}/orders/guest/${paymentResult.orderId}/status`);
      const guestOrder = guestResponse.data;
      console.log('✅ Pedido encontrado via API guest:', {
        id: guestOrder.id,
        userId: guestOrder.userId,
        status: guestOrder.status,
        paymentStatus: guestOrder.paymentStatus,
        total: guestOrder.total
      });
    }

    // 5. Simular URLs de confirmação
    console.log('\n🎯 5. URLs de confirmação geradas:');
    const confirmationUrl = `http://localhost:3000/order-confirmation?orderId=${paymentResult.orderId}&fromPayment=true`;
    console.log('📄 URL de confirmação:', confirmationUrl);
    
    const myOrdersUrl = `http://localhost:3000/meus-pedidos`;
    console.log('📋 URL meus pedidos:', myOrdersUrl);

    // 6. Validações finais
    console.log('\n✅ === VALIDAÇÕES FINAIS ===');
    
    if (paymentResult.userType === 'authenticated') {
      console.log('✅ PASSOU: Usuário autenticado');
    } else {
      console.log('❌ FALHOU: Tipo de usuário incorreto');
    }
    
    if (paymentResult.userAssociated === true) {
      console.log('✅ PASSOU: Usuário foi associado ao pedido');
    } else {
      console.log('❌ FALHOU: Usuário não foi associado');
    }
    
    if (paymentResult.userId === user.id) {
      console.log('✅ PASSOU: ID do usuário correto');
    } else {
      console.log('❌ FALHOU: ID do usuário incorreto');
    }
    
    if (paymentResult.status === 'approved') {
      console.log('✅ PASSOU: Pagamento aprovado');
    } else {
      console.log('❌ FALHOU: Status de pagamento incorreto');
    }

    console.log('\n🎉 === TESTE COMPLETO FINALIZADO ===');
    console.log('📝 Agora você pode:');
    console.log(`   1. Acessar: ${confirmationUrl}`);
    console.log(`   2. Ver pedidos: ${myOrdersUrl}`);
    console.log(`   3. Verificar no banco se o pedido ${paymentResult.orderId} tem userId = ${user.id}`);

  } catch (error) {
    console.error('\n❌ === TESTE FALHOU ===');
    console.error('Erro:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Executar teste
testCompleteCheckoutFlow(); 