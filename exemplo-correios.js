// Exemplo de uso da integração com os Correios
// Execute: node exemplo-correios.js

const axios = require('axios');

const API_BASE = 'http://localhost:4000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'SEU_TOKEN_DE_ADMIN_AQUI';

// Headers padrão
const headers = {
  'Authorization': `Bearer ${ADMIN_TOKEN}`,
  'Content-Type': 'application/json'
};

async function exemploCompleto() {
  try {
    console.log('🚀 Testando integração com os Correios...\n');

    // 1. Testar configuração
    console.log('1. Testando configuração dos Correios...');
    const configTest = await axios.get(`${API_BASE}/correios/testar-conexao`, { headers });
    console.log('✅ Configuração:', configTest.data.message);
    console.log('');

    // 2. Gerar código de rastreio para um pedido específico
    const orderId = 1; // Substitua pelo ID do pedido real
    console.log(`2. Gerando código de rastreio para pedido ${orderId}...`);
    
    try {
      const rastreioResponse = await axios.post(
        `${API_BASE}/correios/gerar-rastreio/${orderId}`, 
        {}, 
        { headers }
      );
      console.log('✅ Código gerado:', rastreioResponse.data.trackingNumber);
      console.log('📦 Pedido:', rastreioResponse.data.orderId);
    } catch (error) {
      console.log('⚠️ Erro ao gerar código:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 3. Processar todos os pedidos pagos
    console.log('3. Processando todos os pedidos pagos...');
    try {
      const processResponse = await axios.post(
        `${API_BASE}/correios/processar-pedidos`, 
        {}, 
        { headers }
      );
      console.log('✅ Processamento:', processResponse.data.message);
    } catch (error) {
      console.log('⚠️ Erro no processamento:', error.response?.data?.error || error.message);
    }
    console.log('');

    // 4. Rastrear um código (exemplo público - não precisa de token)
    const codigoExemplo = 'BR123456789BR';
    console.log(`4. Rastreando código ${codigoExemplo} (público)...`);
    
    try {
      const trackResponse = await axios.get(`${API_BASE}/correios/rastrear/${codigoExemplo}`);
      console.log('✅ Rastreamento:', trackResponse.data);
    } catch (error) {
      console.log('⚠️ Código não encontrado ou inválido');
    }
    console.log('');

    // 5. Exemplo detalhado de criação manual de pré-postagem
    console.log('5. Exemplo detalhado de criação manual de pré-postagem:');
    console.log('\nPara criar uma pré-postagem manualmente, você precisa fornecer:');
    
    console.log(`
    // Exemplo de payload para criar pré-postagem
    {
      "remetente": {
        "nome": "KIMONO STORE",
        "cnpj": "48496267000148", // Apenas números
        "inscricaoEstadual": "ISENTO",
        "endereco": {
          "logradouro": "R VIEIRA PORTUENSE",
          "numero": "62",
          "complemento": "FUNDOS",
          "bairro": "JARDIM ORIENTAL",
          "cidade": "SAO PAULO",
          "uf": "SP",
          "cep": "04347080" // Apenas números, sem pontos ou traços
        },
        "telefone": "11981019084", // Apenas números
        "email": "contato@kimonostore.com"
      },
      "destinatario": {
        "nome": "NOME DO CLIENTE",
        "documento": "12345678900", // CPF ou CNPJ (apenas números)
        "telefone": "11999999999", // Opcional
        "email": "cliente@email.com", // Opcional
        "endereco": {
          "logradouro": "RUA DO CLIENTE",
          "numero": "123",
          "complemento": "APTO 45", // Opcional
          "bairro": "BAIRRO DO CLIENTE",
          "cidade": "SAO PAULO",
          "uf": "SP",
          "cep": "01234567" // Apenas números
        }
      },
      "servico": "03298", // PAC Contrato (03298) ou SEDEX Contrato (03220)
      "volumes": [
        {
          "altura": 5, // em cm
          "largura": 25, // em cm
          "comprimento": 30, // em cm
          "peso": 500, // em gramas (mínimo 300g)
          "tipoObjeto": 2, // 2 = Pacote
          "valorDeclarado": 100 // opcional, em reais
        }
      ],
      "servicosAdicionais": ["001"], // 001 = Valor declarado (opcional)
      "observacao": "Pedido #123" // opcional
    }
    `);

    console.log('🎉 Teste completo finalizado!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Dica: Verifique se o token de admin está correto');
    } else if (error.response?.status === 400) {
      console.log('💡 Dica: Verifique se as variáveis de ambiente dos Correios estão configuradas');
    }
  }
}

// Exemplo usando async/await
async function exemploRapido() {
  const orderId = 1;
  
  try {
    // Gerar código de rastreio
    const response = await axios.post(
      `${API_BASE}/correios/gerar-rastreio/${orderId}`,
      {},
      { headers }
    );
    
    console.log('Código de rastreio gerado:', response.data.trackingNumber);
    
  } catch (error) {
    console.error('Erro:', error.response?.data?.error || error.message);
  }
}

// Exemplo usando curl (para copiar e colar)
function exemplosCurl() {
  console.log('\n📋 Exemplos usando curl:\n');
  
  console.log('# 1. Testar configuração');
  console.log(`curl -X GET "${API_BASE}/correios/testar-conexao" \\`);
  console.log(`  -H "Authorization: Bearer ${ADMIN_TOKEN}"`);
  console.log('');
  
  console.log('# 2. Gerar código de rastreio');
  console.log(`curl -X POST "${API_BASE}/correios/gerar-rastreio/1" \\`);
  console.log(`  -H "Authorization: Bearer ${ADMIN_TOKEN}" \\`);
  console.log(`  -H "Content-Type: application/json"`);
  console.log('');
  
  console.log('# 3. Processar pedidos pagos');
  console.log(`curl -X POST "${API_BASE}/correios/processar-pedidos" \\`);
  console.log(`  -H "Authorization: Bearer ${ADMIN_TOKEN}" \\`);
  console.log(`  -H "Content-Type: application/json"`);
  console.log('');
  
  console.log('# 4. Rastrear código (público)');
  console.log(`curl -X GET "${API_BASE}/correios/rastrear/BR123456789BR"`);
  console.log('');
}

// Verificar se deve executar
if (require.main === module) {
  const arg = process.argv[2];
  
  if (arg === 'curl') {
    exemplosCurl();
  } else if (arg === 'rapido') {
    exemploRapido();
  } else {
    exemploCompleto();
  }
}

module.exports = {
  exemploCompleto,
  exemploRapido,
  exemplosCurl
}; 