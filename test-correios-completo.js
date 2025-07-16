// Script para testar diferentes métodos de autenticação e endpoints da API dos Correios
require('dotenv').config();
const axios = require('axios');

// URLs da API
const CORREIOS_URLS = {
  homologacao: 'https://apihom.correios.com.br',
  producao: 'https://api.correios.com.br',
  cwsHomologacao: 'https://cwshom.correios.com.br/api',
  cwsProducao: 'https://cws.correios.com.br/api'
};

// Endpoints específicos
const CORREIOS_ENDPOINTS = {
  token: {
    autentica: '/token/v1/autentica',
    autenticaCartaoPostagem: '/token/v1/autentica/cartaopostagem'
  },
  cep: {
    consultaV1: '/cep/v1/enderecos',
    consultaV2: '/cep/v2/enderecos',
    consultaCepUnicoV1: '/cep/v1/enderecos/',
    consultaCepUnicoV2: '/cep/v2/enderecos/',
    listaUfs: '/cep/v1/ufs',
    consultaUf: '/cep/v1/ufs/',
    listaLocalidades: '/cep/v1/localidades'
  },
  rastreamento: {
    consulta: '/srorastro/v1/objetos'
  }
};

async function testarCorreiosCompleto() {
  try {
    console.log('🔍 Testando diferentes métodos de autenticação e endpoints da API dos Correios...');
    
    // Configurações
    const ambiente = process.env.CORREIOS_AMBIENTE || 'PRODUCAO';
    const idCorreios = process.env.CORREIOS_ID || process.env.CORREIOS_USER;
    const codigoAcesso = process.env.CORREIOS_CODIGO_ACESSO || process.env.CORREIOS_PASSWORD;
    const cartaoPostagem = process.env.CORREIOS_CARTAO_POSTAGEM;
    
    const baseURL = ambiente === 'PRODUCAO' 
      ? CORREIOS_URLS.producao 
      : CORREIOS_URLS.homologacao;
    
    const cwsURL = ambiente === 'PRODUCAO'
      ? CORREIOS_URLS.cwsProducao
      : CORREIOS_URLS.cwsHomologacao;
    
    console.log(`🔧 Ambiente: ${ambiente}`);
    console.log(`🔧 ID Correios: ${idCorreios}`);
    console.log(`🔧 Cartão de Postagem: ${cartaoPostagem || 'Não configurado'}`);
    console.log(`🔧 URL base API: ${baseURL}`);
    console.log(`🔧 URL base CWS: ${cwsURL}`);
    
    // Verificar configurações
    if (!idCorreios || !codigoAcesso) {
      console.error('❌ Configuração incompleta. Verifique as variáveis de ambiente:');
      console.error('- CORREIOS_ID ou CORREIOS_USER');
      console.error('- CORREIOS_CODIGO_ACESSO ou CORREIOS_PASSWORD');
      return;
    }
    
    // Criar credenciais em formato Base64 para autenticação Basic
    const credentials = Buffer.from(`${idCorreios}:${codigoAcesso}`).toString('base64');
    console.log(`🔧 Credenciais Base64 geradas (primeiros 10 caracteres): ${credentials.substring(0, 10)}...`);
    
    // Tokens obtidos
    const tokens = {
      api: null,
      apiCartao: null,
      cws: null
    };
    
    // 1. Testar autenticação direta na API
    console.log('\n🔑 [1] Testando autenticação direta na API...');
    try {
      console.log(`🔧 URL: ${baseURL}${CORREIOS_ENDPOINTS.token.autentica}`);
      
      const response = await axios({
        method: 'post',
        url: `${baseURL}${CORREIOS_ENDPOINTS.token.autentica}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 30000
      });
      
      console.log(`✅ Status da resposta: ${response.status}`);
      
      if (response.data && response.data.token) {
        console.log(`✅ Token obtido: ${response.data.token.substring(0, 20)}...`);
        console.log(`✅ Expira em: ${response.data.expiraEm || 'N/A'}`);
        console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
        
        tokens.api = response.data.token;
      } else {
        console.error('❌ Resposta sem token válido');
        console.error('❌ Dados da resposta:', JSON.stringify(response.data || {}));
      }
    } catch (authError) {
      console.error('❌ Erro na autenticação API direta:', authError.message);
      
      if (authError.response) {
        console.error('❌ Status da resposta:', authError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(authError.response.data || {}));
      }
    }
    
    // 2. Testar autenticação com cartão de postagem
    if (cartaoPostagem) {
      console.log('\n🔑 [2] Testando autenticação com cartão de postagem...');
      try {
        console.log(`🔧 URL: ${baseURL}${CORREIOS_ENDPOINTS.token.autenticaCartaoPostagem}`);
        console.log(`🔧 Cartão de Postagem: ${cartaoPostagem}`);
        
        const response = await axios({
          method: 'post',
          url: `${baseURL}${CORREIOS_ENDPOINTS.token.autenticaCartaoPostagem}`,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Basic ${credentials}`
          },
          data: {
            numero: cartaoPostagem
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        
        if (response.data && response.data.token) {
          console.log(`✅ Token obtido: ${response.data.token.substring(0, 20)}...`);
          console.log(`✅ Expira em: ${response.data.expiraEm || 'N/A'}`);
          console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
          
          tokens.apiCartao = response.data.token;
        } else {
          console.error('❌ Resposta sem token válido');
          console.error('❌ Dados da resposta:', JSON.stringify(response.data || {}));
        }
      } catch (cartaoError) {
        console.error('❌ Erro na autenticação com cartão de postagem:', cartaoError.message);
        
        if (cartaoError.response) {
          console.error('❌ Status da resposta:', cartaoError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(cartaoError.response.data || {}));
        }
      }
    }
    
    // 3. Testar autenticação no CWS
    console.log('\n🔑 [3] Testando autenticação no CWS...');
    try {
      console.log(`🔧 URL: ${cwsURL}${CORREIOS_ENDPOINTS.token.autentica}`);
      
      const response = await axios({
        method: 'post',
        url: `${cwsURL}${CORREIOS_ENDPOINTS.token.autentica}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        timeout: 30000
      });
      
      console.log(`✅ Status da resposta: ${response.status}`);
      
      if (response.data && response.data.token) {
        console.log(`✅ Token obtido: ${response.data.token.substring(0, 20)}...`);
        console.log(`✅ Expira em: ${response.data.expiraEm || 'N/A'}`);
        console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
        
        tokens.cws = response.data.token;
      } else {
        console.error('❌ Resposta sem token válido');
        console.error('❌ Dados da resposta:', JSON.stringify(response.data || {}));
      }
    } catch (cwsError) {
      console.error('❌ Erro na autenticação CWS:', cwsError.message);
      
      if (cwsError.response) {
        console.error('❌ Status da resposta:', cwsError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(cwsError.response.data || {}));
      }
    }
    
    // Verificar se temos pelo menos um token para continuar
    if (!tokens.api && !tokens.apiCartao && !tokens.cws) {
      console.error('❌ Nenhum token obtido. Não é possível continuar os testes.');
      return;
    }
    
    console.log('\n✅ Autenticações concluídas. Continuando com testes de endpoints...');
    
    // Testar CEP v1 com token API
    if (tokens.api) {
      console.log('\n🔍 [4] Testando CEP v1 com token API...');
      try {
        const cepTeste = '04347080';
        console.log(`🔧 Consultando CEP: ${cepTeste}`);
        
        const response = await axios({
          method: 'get',
          url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consultaCepUnicoV1}${cepTeste}`,
          headers: {
            'Authorization': `Bearer ${tokens.api}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        console.log('📍 Endereço:', JSON.stringify(response.data, null, 2));
      } catch (cepError) {
        console.error('❌ Erro ao consultar CEP v1 com token API:', cepError.message);
        
        if (cepError.response) {
          console.error('❌ Status da resposta:', cepError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
        }
      }
    }
    
    // Testar CEP v2 com token API
    if (tokens.api) {
      console.log('\n🔍 [5] Testando CEP v2 com token API...');
      try {
        const cepTeste = '04347080';
        console.log(`🔧 Consultando CEP: ${cepTeste}`);
        
        const response = await axios({
          method: 'get',
          url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consultaCepUnicoV2}${cepTeste}`,
          headers: {
            'Authorization': `Bearer ${tokens.api}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        console.log('📍 Endereço:', JSON.stringify(response.data, null, 2));
      } catch (cepError) {
        console.error('❌ Erro ao consultar CEP v2 com token API:', cepError.message);
        
        if (cepError.response) {
          console.error('❌ Status da resposta:', cepError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
        }
      }
    }
    
    // Testar CEP v1 com token de cartão de postagem
    if (tokens.apiCartao) {
      console.log('\n🔍 [6] Testando CEP v1 com token de cartão de postagem...');
      try {
        const cepTeste = '04347080';
        console.log(`🔧 Consultando CEP: ${cepTeste}`);
        
        const response = await axios({
          method: 'get',
          url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consultaCepUnicoV1}${cepTeste}`,
          headers: {
            'Authorization': `Bearer ${tokens.apiCartao}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        console.log('📍 Endereço:', JSON.stringify(response.data, null, 2));
      } catch (cepError) {
        console.error('❌ Erro ao consultar CEP v1 com token de cartão:', cepError.message);
        
        if (cepError.response) {
          console.error('❌ Status da resposta:', cepError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
        }
      }
    }
    
    // Testar CEP v2 com token de cartão de postagem
    if (tokens.apiCartao) {
      console.log('\n🔍 [7] Testando CEP v2 com token de cartão de postagem...');
      try {
        const cepTeste = '04347080';
        console.log(`🔧 Consultando CEP: ${cepTeste}`);
        
        const response = await axios({
          method: 'get',
          url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consultaCepUnicoV2}${cepTeste}`,
          headers: {
            'Authorization': `Bearer ${tokens.apiCartao}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        console.log('📍 Endereço:', JSON.stringify(response.data, null, 2));
      } catch (cepError) {
        console.error('❌ Erro ao consultar CEP v2 com token de cartão:', cepError.message);
        
        if (cepError.response) {
          console.error('❌ Status da resposta:', cepError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
        }
      }
    }
    
    // Testar CEP v1 com token CWS
    if (tokens.cws) {
      console.log('\n🔍 [8] Testando CEP v1 com token CWS...');
      try {
        const cepTeste = '04347080';
        console.log(`🔧 Consultando CEP: ${cepTeste}`);
        
        const response = await axios({
          method: 'get',
          url: `${cwsURL}${CORREIOS_ENDPOINTS.cep.consultaCepUnicoV1}${cepTeste}`,
          headers: {
            'Authorization': `Bearer ${tokens.cws}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        console.log('📍 Endereço:', JSON.stringify(response.data, null, 2));
      } catch (cepError) {
        console.error('❌ Erro ao consultar CEP v1 com token CWS:', cepError.message);
        
        if (cepError.response) {
          console.error('❌ Status da resposta:', cepError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
        }
      }
    }
    
    // Testar CEP v2 com token CWS
    if (tokens.cws) {
      console.log('\n🔍 [9] Testando CEP v2 com token CWS...');
      try {
        const cepTeste = '04347080';
        console.log(`🔧 Consultando CEP: ${cepTeste}`);
        
        const response = await axios({
          method: 'get',
          url: `${cwsURL}${CORREIOS_ENDPOINTS.cep.consultaCepUnicoV2}${cepTeste}`,
          headers: {
            'Authorization': `Bearer ${tokens.cws}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        console.log('📍 Endereço:', JSON.stringify(response.data, null, 2));
      } catch (cepError) {
        console.error('❌ Erro ao consultar CEP v2 com token CWS:', cepError.message);
        
        if (cepError.response) {
          console.error('❌ Status da resposta:', cepError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
        }
      }
    }
    
    // Testar rastreamento de objetos
    if (tokens.api) {
      console.log('\n🔍 [10] Testando rastreamento de objetos...');
      try {
        // Código de rastreio de exemplo
        const codigoRastreio = 'LB290764342HK';
        console.log(`🔧 Rastreando objeto: ${codigoRastreio}`);
        
        const response = await axios({
          method: 'get',
          url: `${baseURL}${CORREIOS_ENDPOINTS.rastreamento.consulta}/${codigoRastreio}`,
          headers: {
            'Authorization': `Bearer ${tokens.api}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ Status da resposta: ${response.status}`);
        console.log('📦 Dados do rastreamento:', JSON.stringify(response.data, null, 2));
      } catch (rastreioError) {
        console.error('❌ Erro ao rastrear objeto:', rastreioError.message);
        
        if (rastreioError.response) {
          console.error('❌ Status da resposta:', rastreioError.response.status);
          console.error('❌ Dados da resposta:', JSON.stringify(rastreioError.response.data || {}));
        }
      }
    }
    
    console.log('\n✅ Testes completos concluídos!');
    console.log('\n📋 Resumo dos resultados:');
    console.log(`- Autenticação API direta: ${tokens.api ? '✅ Sucesso' : '❌ Falha'}`);
    console.log(`- Autenticação com cartão de postagem: ${tokens.apiCartao ? '✅ Sucesso' : cartaoPostagem ? '❌ Falha' : '⚠️ Não testado (cartão não configurado)'}`);
    console.log(`- Autenticação CWS: ${tokens.cws ? '✅ Sucesso' : '❌ Falha'}`);
    
    console.log('\n💡 Recomendações:');
    console.log('1. Verifique se seu contrato com os Correios inclui acesso à API de CEP');
    console.log('2. Confirme se as credenciais estão corretas e ativas');
    console.log('3. Entre em contato com o suporte dos Correios para confirmar quais APIs estão disponíveis para o seu contrato');
    console.log('4. Considere usar uma API alternativa de CEP como o BrasilAPI ou ViaCEP para consultas de CEP');
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar os testes
testarCorreiosCompleto(); 