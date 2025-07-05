#!/usr/bin/env node

/**
 * 🔔 SIMULADOR DE WEBHOOK MERCADO PAGO
 * 
 * Este script simula um webhook real do MP com assinatura HMAC correta
 */

const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_URL = 'https://e614-187-115-177-238.ngrok-free.app/api/mercadopago/webhook';
const WEBHOOK_SECRET = 'd3522a9b4cda1382ccbc316d4f64f1036b2bb7e31ace746ed3e26645c7430a5e';

console.log('🧪 SIMULANDO WEBHOOK REAL DO MERCADO PAGO\n');

function generateValidSignature(dataId, requestId, timestamp) {
  // Criar o manifest exatamente como o MP faz
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  
  // Gerar HMAC SHA256
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(manifest);
  const hash = hmac.digest('hex');
  
  // Retornar no formato que o MP usa
  return `ts=${timestamp},v1=${hash}`;
}

async function simulateWebhook() {
  try {
    console.log('1️⃣ Preparando dados do webhook...');
    
    // Dados simulados
    const dataId = 'payment_12345';
    const requestId = `req_${Date.now()}`;
    const timestamp = Date.now().toString(); // Timestamp atual em milissegundos (como o MP envia)
    
    // Body do webhook
    const webhookBody = {
      type: 'payment',
      action: 'payment.updated',
      data: {
        id: dataId
      }
    };
    
    // Gerar assinatura válida
    const signature = generateValidSignature(dataId, requestId, timestamp);
    
    console.log('📋 Dados preparados:');
    console.log('  Data ID:', dataId);
    console.log('  Request ID:', requestId);
    console.log('  Timestamp:', timestamp, '(', new Date(parseInt(timestamp)).toISOString(), ')');
    console.log('  Signature:', signature);
    
    console.log('\n2️⃣ Enviando webhook simulado...');
    
    const response = await axios.post(WEBHOOK_URL, webhookBody, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago/1.0',
        'x-signature': signature,
        'x-request-id': requestId
      },
      validateStatus: () => true // Aceitar qualquer status
    });

    console.log('3️⃣ Resposta recebida:');
    console.log('  Status:', response.status);
    console.log('  Headers:', response.headers);
    console.log('  Body:', response.data);
    
    if (response.status === 200) {
      console.log('\n✅ SUCESSO! Webhook processado corretamente');
      return true;
    } else if (response.status === 401) {
      console.log('\n❌ FALHA: Assinatura ainda inválida');
      console.log('🔧 Possíveis causas:');
      console.log('   - Chave secreta incorreta no .env');
      console.log('   - Formato de assinatura diferente');
      console.log('   - Validação de timestamp muito restritiva');
      return false;
    } else {
      console.log(`\n⚠️ Status inesperado: ${response.status}`);
      return false;
    }

  } catch (error) {
    console.log('\n❌ Erro ao simular webhook:', error.message);
    return false;
  }
}

function showManualTest() {
  const dataId = 'payment_12345';
  const requestId = `req_${Date.now()}`;
  const timestamp = Date.now().toString(); // Em milissegundos
  const signature = generateValidSignature(dataId, requestId, timestamp);
  
  console.log('\n📋 TESTE MANUAL COM CURL:');
  console.log('');
  console.log(`curl -X POST "${WEBHOOK_URL}" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "x-signature: ${signature}" \\`);
  console.log(`  -H "x-request-id: ${requestId}" \\`);
  console.log(`  -d '{`);
  console.log(`    "type": "payment",`);
  console.log(`    "action": "payment.updated",`);
  console.log(`    "data": {`);
  console.log(`      "id": "${dataId}"`);
  console.log(`    }`);
  console.log(`  }'`);
  console.log('');
}

async function main() {
  console.log('🔑 Chave secreta:', WEBHOOK_SECRET);
  console.log('🌐 URL de teste:', WEBHOOK_URL);
  console.log('');
  
  const success = await simulateWebhook();
  
  if (!success) {
    showManualTest();
  }
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Verificar se a chave secreta está correta no .env');
  console.log('2. Reiniciar o servidor: npm run dev');
  console.log('3. Testar novamente no painel do MP');
  console.log('4. Verificar logs detalhados do servidor');
}

// Executar simulação
main().catch(console.error); 