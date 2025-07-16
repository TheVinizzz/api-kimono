// Script para testar a conexão com a API dos Correios usando as variáveis exatas do .env
require('dotenv').config();
const axios = require('axios');

async function testarConexaoCorreios() {
  try {
    console.log('🔍 Testando conexão com a API dos Correios com as variáveis exatas do .env...');
    
    // Usar exatamente as variáveis como estão no .env
    const idCorreios = process.env.CORREIOS_ID;
    const codigoAcesso = process.env.CORREIOS_CODIGO_ACESSO;
    const ambiente = process.env.CORREIOS_AMBIENTE || 'PRODUCAO';
    
    // URL base conforme ambiente
    const baseURL = ambiente === 'PRODUCAO' 
      ? 'https://api.correios.com.br' 
      : 'https://apihom.correios.com.br';
    
    console.log(`🔧 Ambiente: ${ambiente}`);
    console.log(`🔧 ID Correios: ${idCorreios}`);
    console.log(`🔧 URL base API: ${baseURL}`);
    
    // Verificar configurações
    if (!idCorreios || !codigoAcesso) {
      console.error('❌ Configuração incompleta. Verifique as variáveis de ambiente:');
      console.error('- CORREIOS_ID');
      console.error('- CORREIOS_CODIGO_ACESSO');
      return;
    }
    
    // Criar credenciais em formato Base64 para autenticação Basic
    const credentials = Buffer.from(`${idCorreios}:${codigoAcesso}`).toString('base64');
    console.log(`🔧 Credenciais Base64 geradas (primeiros 10 caracteres): ${credentials.substring(0, 10)}...`);
    
    // Testar autenticação diretamente na API
    console.log('\n🔍 Testando autenticação na API...');
    try {
      const endpoint = '/token/v1/autentica';
      console.log(`🔧 URL: ${baseURL}${endpoint}`);
      console.log('🔧 Enviando requisição...');
      
      const response = await axios({
        method: 'post',
        url: `${baseURL}${endpoint}`,
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
            url: `${baseURL}/cep/v1/enderecos/${cepTeste}`,
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
          } else {
            console.error('❌ Erro:', cepError.message);
          }
        }
      } else {
        console.error('❌ Resposta sem token válido');
        console.error('❌ Dados da resposta:', JSON.stringify(response.data || {}));
      }
    } catch (authError) {
      console.error('❌ Erro na autenticação API:', authError.message);
      
      if (authError.response) {
        console.error('❌ Status da resposta:', authError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(authError.response.data || {}));
      } else {
        console.error('❌ Erro sem resposta do servidor');
      }
    }
    
    // Testar também com as variáveis USER/PASSWORD
    console.log('\n🔍 Testando autenticação alternativa com USER/PASSWORD...');
    try {
      const userCorreios = process.env.CORREIOS_USER;
      const passwordCorreios = process.env.CORREIOS_PASSWORD;
      
      if (!userCorreios || !passwordCorreios) {
        console.error('❌ Variáveis USER/PASSWORD não encontradas no .env');
        return;
      }
      
      console.log(`🔧 USER: ${userCorreios}`);
      
      const altCredentials = Buffer.from(`${userCorreios}:${passwordCorreios}`).toString('base64');
      console.log(`🔧 Credenciais alternativas Base64 (primeiros 10 caracteres): ${altCredentials.substring(0, 10)}...`);
      
      const endpoint = '/token/v1/autentica';
      console.log(`🔧 URL: ${baseURL}${endpoint}`);
      
      const response = await axios({
        method: 'post',
        url: `${baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${altCredentials}`
        },
        timeout: 30000
      });
      
      console.log(`🔧 Status da resposta: ${response.status}`);
      console.log(`✅ Autenticação alternativa bem-sucedida!`);
      
      if (response.data && response.data.token) {
        console.log(`✅ Token obtido: ${response.data.token.substring(0, 20)}...`);
        console.log(`✅ Expira em: ${response.data.expiraEm || 'N/A'}`);
      }
    } catch (altError) {
      console.error('❌ Erro na autenticação alternativa:', altError.message);
      
      if (altError.response) {
        console.error('❌ Status da resposta:', altError.response.status);
        console.error('❌ Dados da resposta:', JSON.stringify(altError.response.data || {}));
      }
    }
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar o teste
testarConexaoCorreios(); 