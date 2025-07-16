// Script para testar a conexão com a API dos Correios
require('dotenv').config();
const axios = require('axios');

// Importar configurações dos endpoints
const CORREIOS_ENDPOINTS = {
  token: {
    autentica: '/token/v1/autentica',
    autenticaCartaoPostagem: '/token/v1/autentica/cartaopostagem'
  },
  cep: {
    consulta: '/cep/v1/enderecos'
  },
  prepostagem: {
    criar: '/prepostagem/v1/objetos'
  },
  rastreamento: {
    consulta: '/srorastro/v1/objetos'
  }
};

// URLs da API
const CORREIOS_URLS = {
  homologacao: 'https://apihom.correios.com.br',
  producao: 'https://api.correios.com.br',
  cwsHomologacao: 'https://cwshom.correios.com.br/api',
  cwsProducao: 'https://cws.correios.com.br/api'
};

async function testarConexaoCorreios() {
  try {
    console.log('🔍 Testando conexão com a API dos Correios...');
    
    // Forçar ambiente de produção (baseado na imagem da documentação)
    const ambiente = 'PRODUCAO';
    const idCorreios = process.env.CORREIOS_USER;
    const codigoAcesso = process.env.CORREIOS_PASSWORD;
    const cartaoPostagem = process.env.CORREIOS_CARTAO_POSTAGEM;
    
    const baseURL = CORREIOS_URLS.producao;
    const cwsURL = CORREIOS_URLS.cwsProducao;
    
    console.log(`🔧 Ambiente: ${ambiente} (forçado para produção)`);
    console.log(`🔧 ID Correios: ${idCorreios}`);
    console.log(`🔧 Cartão de Postagem: ${cartaoPostagem}`);
    console.log(`🔧 URL base API: ${baseURL}`);
    
    // Verificar configurações
    if (!idCorreios || !codigoAcesso) {
      console.error('❌ Configuração incompleta. Verifique as variáveis de ambiente:');
      console.error('- CORREIOS_USER');
      console.error('- CORREIOS_PASSWORD');
      return;
    }
    
    // Limpar CEP e telefone
    function cleanString(str) {
      return str ? str.replace(/\D/g, '') : '';
    }
    
    // Verificar dados do remetente
    const remetenteCep = cleanString(process.env.CORREIOS_REMETENTE_CEP);
    const remetenteCnpj = cleanString(process.env.CORREIOS_REMETENTE_CNPJ);
    
    if (!remetenteCep || remetenteCep.length !== 8) {
      console.error('❌ CEP do remetente inválido ou não formatado corretamente');
      console.error(`❌ CEP atual: ${process.env.CORREIOS_REMETENTE_CEP}`);
      console.error('💡 O CEP deve conter 8 dígitos numéricos (sem pontos ou traços)');
    } else {
      console.log(`✅ CEP do remetente válido: ${remetenteCep}`);
    }
    
    if (!remetenteCnpj || remetenteCnpj.length !== 14) {
      console.error('❌ CNPJ do remetente inválido ou não formatado corretamente');
      console.error('💡 O CNPJ deve conter 14 dígitos numéricos');
    } else {
      console.log(`✅ CNPJ do remetente válido: ${remetenteCnpj}`);
    }
    
    // Criar credenciais em formato Base64 para autenticação Basic
    const credentials = Buffer.from(`${idCorreios}:${codigoAcesso}`).toString('base64');
    console.log(`🔧 Credenciais Base64 geradas (primeiros 10 caracteres): ${credentials.substring(0, 10)}...`);
    
    // Testar autenticação diretamente na API
    console.log('\n🔍 Testando autenticação direta na API de produção...');
    try {
      console.log(`🔧 URL: ${baseURL}${CORREIOS_ENDPOINTS.token.autentica}`);
      console.log('🔧 Enviando requisição...');
      
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
      
      console.log(`🔧 Status da resposta: ${response.status}`);
      console.log(`✅ Conexão com a API dos Correios estabelecida com sucesso!`);
      
      if (response.data && response.data.token) {
        console.log(`✅ Token obtido: ${response.data.token.substring(0, 20)}...`);
        console.log(`✅ Expira em: ${response.data.expiraEm || 'N/A'}`);
        console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
        console.log('✅ Teste concluído com sucesso!');
        
        // Salvar o token para uso posterior
        const token = response.data.token;
        
        // Testar endpoint de CEP
        console.log('\n🔍 Testando endpoint de CEP...');
        try {
          // CEP de teste
          const cepTeste = '04347080';
          console.log(`🔧 Consultando CEP de teste: ${cepTeste}`);
          
          const cepResponse = await axios({
            method: 'get',
            url: `${baseURL}${CORREIOS_ENDPOINTS.cep.consulta}/${cepTeste}`,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 30000
          });
          
          console.log(`🔧 Status da resposta de CEP: ${cepResponse.status}`);
          console.log('✅ Endpoint de CEP funcionando!');
          console.log('📍 Endereço:', JSON.stringify(cepResponse.data, null, 2));
        } catch (cepError) {
          console.log('⚠️ Erro ao testar consulta de CEP');
          if (cepError.response) {
            console.error('❌ Status da resposta:', cepError.response.status);
            console.error('❌ Dados da resposta:', JSON.stringify(cepError.response.data || {}));
          }
        }
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
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar o teste
testarConexaoCorreios(); 