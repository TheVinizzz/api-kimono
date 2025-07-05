#!/usr/bin/env node

/**
 * 🔔 SCRIPT DE TESTE - WEBHOOK MERCADO PAGO
 * 
 * Este script testa se o webhook está configurado corretamente
 */

const axios = require('axios');

const WEBHOOK_URL = 'https://e614-187-115-177-238.ngrok-free.app/api/mercadopago/webhook';
const API_BASE_URL = 'https://e614-187-115-177-238.ngrok-free.app';

console.log('🧪 TESTANDO WEBHOOK MERCADO PAGO\n');

async function testApiStatus() {
  try {
    console.log('1️⃣ Testando status da API...');
    const response = await axios.get(API_BASE_URL);
    console.log('✅ API Online:', response.data);
    return true;
  } catch (error) {
    console.log('❌ API Offline:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  try {
    console.log('\n2️⃣ Testando endpoint do webhook...');
    
    const testPayload = {
      type: 'payment',
      action: 'payment.updated',
      data: {
        id: 'test-payment-123'
      }
    };

    const response = await axios.post(WEBHOOK_URL, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago-Test'
      },
      validateStatus: () => true // Aceitar qualquer status
    });

    if (response.status === 401) {
      console.log('✅ Webhook funcionando (erro 401 esperado - validação de assinatura)');
      console.log('📋 Resposta:', response.data);
      return true;
    } else {
      console.log(`⚠️ Status inesperado: ${response.status}`);
      console.log('📋 Resposta:', response.data);
      return false;
    }

  } catch (error) {
    console.log('❌ Erro no teste webhook:', error.message);
    return false;
  }
}

function showConfiguration() {
  console.log('\n📋 CONFIGURAÇÃO PARA O PAINEL MP:');
  console.log(`🌐 URL: ${WEBHOOK_URL}`);
  console.log('📋 Eventos: payment.created, payment.updated, payment.approved, etc.');
  console.log('⚙️ Método: POST');
  console.log('📄 Content-Type: application/json');
}

function showNextSteps() {
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Acesse: https://www.mercadopago.com.br/developers/panel');
  console.log('2. Vá em Webhooks > Criar webhook');
  console.log(`3. Cole a URL: ${WEBHOOK_URL}`);
  console.log('4. Marque todos os eventos de payment');
  console.log('5. Copie a chave secreta para o .env');
  console.log('6. Reinicie o servidor: npm run dev');
}

async function main() {
  const apiOk = await testApiStatus();
  
  if (!apiOk) {
    console.log('\n❌ FALHA: API não está respondendo');
    console.log('🔧 Verifique se o servidor está rodando e o ngrok ativo');
    process.exit(1);
  }

  const webhookOk = await testWebhookEndpoint();
  
  if (!webhookOk) {
    console.log('\n❌ FALHA: Endpoint do webhook não está funcionando');
    process.exit(1);
  }

  showConfiguration();
  showNextSteps();
  
  console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
  console.log('🔔 Webhook pronto para ser configurado no Mercado Pago');
}

// Executar teste
main().catch(console.error); 