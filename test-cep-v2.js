// Script para testar a API de CEP v2 dos Correios
require('dotenv').config();
const axios = require('axios');

// URLs da API
const CORREIOS_URLS = {
  homologacao: 'https://apihom.correios.com.br',
  producao: 'https://api.correios.com.br'
};

// Endpoints específicos
const CORREIOS_ENDPOINTS = {
  token: {
    autentica: '/token/v1/autentica',
    autenticaCartaoPostagem: '/token/v1/autentica/cartaopostagem'
  },
  cep: {
    consultaV2: '/cep/v2/enderecos',
    consultaCepUnico: '/cep/v2/enderecos/',
    listaUfs: '/cep/v1/ufs',
    consultaUf: '/cep/v1/ufs/',
    listaLocalidades: '/cep/v1/localidades'
  }
};

async function testarCepV2() {
  try {
    console.log('🔍 Testando API de CEP v2 dos Correios...');
    
    // Configurações
    const ambiente = process.env.CORREIOS_AMBIENTE || 'PRODUCAO';
    const idCorreios = process.env.CORREIOS_ID || process.env.CORREIOS_USER;
    const codigoAcesso = process.env.CORREIOS_CODIGO_ACESSO || process.env.CORREIOS_PASSWORD;
    
    const baseURL = ambiente === 'PRODUCAO' 
      ? CORREIOS_URLS.producao 
      : CORREIOS_URLS.homologacao;
    
    console.log(`🔧 Ambiente: ${ambiente}`);
    console.log(`🔧 ID Correios: ${idCorreios}`);
    console.log(`🔧 URL base API: ${baseURL}`);
    
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
    
    // Autenticar para obter token
    console.log('\n🔑 Autenticando na API dos Correios...');
    
    const authResponse = await axios({
      method: 'post',
      url: `${baseURL}${CORREIOS_ENDPOINTS.token.autentica}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      timeout: 30000
    });
    
    if (!authResponse.data || !authResponse.data.token) {
      console.error('❌ Falha na autenticação: token não recebido');
      console.error('❌ Resposta:', JSON.stringify(authResponse.data || {}));
      return;
    }
    
    const token = authResponse.data.token;
    console.log(`✅ Token obtido: ${token.substring(0, 20)}...`);
    console.log(`✅ Expira em: ${authResponse.data.expiraEm || 'N/A'}`);
    
    // Testar consulta de CEP único
    console.log('\n🔍 Testando consulta de CEP único (v2)...');
    try {
      const cepTeste = '04347080';
      console.log(`🔧 Consultando CEP: ${cepTeste}`);
      
      const cepResponse = await axios({
        method: 'get',
        url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consultaCepUnico}${cepTeste}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`✅ Status da resposta: ${cepResponse.status}`);
      console.log('📍 Endereço:', JSON.stringify(cepResponse.data, null, 2));
    } catch (cepError) {
      console.error('❌ Erro ao consultar CEP único:', cepError.message);
      
      if (cepError.response) {
        console.error('❌ Status da resposta:', cepError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
      }
    }
    
    // Testar consulta de múltiplos CEPs
    console.log('\n🔍 Testando consulta de múltiplos CEPs (v2)...');
    try {
      const cepsTeste = ['04347080', '01310100', '22041011'];
      console.log(`🔧 Consultando CEPs: ${cepsTeste.join(', ')}`);
      
      // Construir query string
      const queryParams = new URLSearchParams();
      cepsTeste.forEach(cep => queryParams.append('cep', cep));
      
      const cepsResponse = await axios({
        method: 'get',
        url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consultaV2}?${queryParams.toString()}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`✅ Status da resposta: ${cepsResponse.status}`);
      console.log(`✅ Total de itens: ${cepsResponse.data.page?.totalElements || 'N/A'}`);
      console.log('📍 Resultados:', JSON.stringify(cepsResponse.data, null, 2));
    } catch (cepsError) {
      console.error('❌ Erro ao consultar múltiplos CEPs:', cepsError.message);
      
      if (cepsError.response) {
        console.error('❌ Status da resposta:', cepsError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(cepsError.response.data || {}));
      }
    }
    
    // Testar listagem de UFs
    console.log('\n🔍 Testando listagem de UFs...');
    try {
      const ufsResponse = await axios({
        method: 'get',
        url: `${baseURL}${CORREIOS_ENDPOINTS.cep.listaUfs}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`✅ Status da resposta: ${ufsResponse.status}`);
      console.log(`✅ Total de UFs: ${ufsResponse.data.length || 0}`);
      
      // Mostrar apenas as primeiras UFs para não poluir o log
      if (ufsResponse.data && ufsResponse.data.length > 0) {
        console.log('📍 Primeiras UFs:', JSON.stringify(ufsResponse.data.slice(0, 3), null, 2));
      }
    } catch (ufsError) {
      console.error('❌ Erro ao listar UFs:', ufsError.message);
      
      if (ufsError.response) {
        console.error('❌ Status da resposta:', ufsError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(ufsError.response.data || {}));
      }
    }
    
    // Testar consulta de UF específica
    console.log('\n🔍 Testando consulta de UF específica...');
    try {
      const ufTeste = 'SP';
      console.log(`🔧 Consultando UF: ${ufTeste}`);
      
      const ufResponse = await axios({
        method: 'get',
        url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consultaUf}${ufTeste}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`✅ Status da resposta: ${ufResponse.status}`);
      console.log('📍 Dados da UF:', JSON.stringify(ufResponse.data, null, 2));
    } catch (ufError) {
      console.error('❌ Erro ao consultar UF específica:', ufError.message);
      
      if (ufError.response) {
        console.error('❌ Status da resposta:', ufError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(ufError.response.data || {}));
      }
    }
    
    // Testar listagem de localidades
    console.log('\n🔍 Testando listagem de localidades...');
    try {
      // Construir query string com parâmetros
      const queryParams = new URLSearchParams();
      queryParams.append('uf', 'SP');
      queryParams.append('tipo', 'M');
      queryParams.append('size', '5');
      
      const localidadesResponse = await axios({
        method: 'get',
        url: `${baseURL}${CORREIOS_ENDPOINTS.cep.listaLocalidades}?${queryParams.toString()}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`✅ Status da resposta: ${localidadesResponse.status}`);
      console.log(`✅ Total de localidades: ${localidadesResponse.data.page?.totalElements || 'N/A'}`);
      console.log('📍 Resultados:', JSON.stringify(localidadesResponse.data, null, 2));
    } catch (localidadesError) {
      console.error('❌ Erro ao listar localidades:', localidadesError.message);
      
      if (localidadesError.response) {
        console.error('❌ Status da resposta:', localidadesError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(localidadesError.response.data || {}));
      }
    }
    
    console.log('\n✅ Testes da API de CEP v2 concluídos!');
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar os testes
testarCepV2(); 