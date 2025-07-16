/**
 * Script de teste para verificar a integração com os Correios em ambiente de produção
 * 
 * Este script testa:
 * 1. Autenticação na API dos Correios
 * 2. Geração de código de rastreio
 * 3. Consulta de rastreamento
 * 
 * Uso: node test-correios-producao.js
 */

require('dotenv').config();
const axios = require('axios');

// Configurações
const CORREIOS_CONFIG = {
  ambiente: process.env.CORREIOS_AMBIENTE || 'PRODUCAO',
  idCorreios: process.env.CORREIOS_ID,
  codigoAcesso: process.env.CORREIOS_CODIGO_ACESSO,
  contrato: process.env.CORREIOS_CONTRATO,
  cartaoPostagem: process.env.CORREIOS_CARTAO_POSTAGEM,
  remetente: {
    nome: process.env.CORREIOS_REMETENTE_NOME || 'KIMONO STORE',
    cnpj: process.env.CORREIOS_REMETENTE_CNPJ,
    inscricaoEstadual: process.env.CORREIOS_REMETENTE_IE,
    endereco: {
      logradouro: process.env.CORREIOS_REMETENTE_LOGRADOURO,
      numero: process.env.CORREIOS_REMETENTE_NUMERO,
      complemento: process.env.CORREIOS_REMETENTE_COMPLEMENTO || '',
      bairro: process.env.CORREIOS_REMETENTE_BAIRRO,
      cidade: process.env.CORREIOS_REMETENTE_CIDADE,
      uf: process.env.CORREIOS_REMETENTE_UF,
      cep: process.env.CORREIOS_REMETENTE_CEP ? process.env.CORREIOS_REMETENTE_CEP.replace(/\D/g, '') : ''
    },
    telefone: process.env.CORREIOS_REMETENTE_TELEFONE ? process.env.CORREIOS_REMETENTE_TELEFONE.replace(/\D/g, '') : '',
    email: process.env.CORREIOS_REMETENTE_EMAIL
  }
};

// URLs da API
const URLS = {
  producao: 'https://api.correios.com.br',
  homologacao: 'https://apihom.correios.com.br'
};

// Endpoints
const ENDPOINTS = {
  token: {
    autentica: '/token/v1/autentica',
    autenticaCartaoPostagem: '/token/v1/autentica/cartaopostagem'
  },
  prepostagem: {
    criar: '/prepostagem/v1/prepostagens'
  },
  rastreamento: {
    consulta: '/srorastro/v1/objetos'
  }
};

// Cliente HTTP
let apiClient = axios.create({
  baseURL: CORREIOS_CONFIG.ambiente === 'PRODUCAO' ? URLS.producao : URLS.homologacao,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Variáveis globais
let token = null;
let tokenExpiration = null;
let codigoRastreio = null;

// Função para validar configuração
function validarConfiguracao() {
  console.log('🔍 Validando configuração...');
  
  const camposObrigatorios = [
    'CORREIOS_ID',
    'CORREIOS_CODIGO_ACESSO',
    'CORREIOS_CONTRATO',
    'CORREIOS_CARTAO_POSTAGEM',
    'CORREIOS_REMETENTE_CNPJ',
    'CORREIOS_REMETENTE_CEP'
  ];
  
  const camposFaltantes = camposObrigatorios.filter(campo => !process.env[campo]);
  
  if (camposFaltantes.length > 0) {
    console.error('❌ Configuração incompleta. Campos faltantes:');
    camposFaltantes.forEach(campo => console.error(`   - ${campo}`));
    return false;
  }
  
  console.log('✅ Configuração validada com sucesso');
  return true;
}

// Função para autenticar na API
async function autenticar() {
  try {
    console.log('🔑 Autenticando na API dos Correios...');
    console.log(`🔧 Ambiente: ${CORREIOS_CONFIG.ambiente}`);
    console.log(`🔧 URL Base: ${apiClient.defaults.baseURL}`);
    
    // Criar credenciais em formato Base64
    const credentials = Buffer.from(`${CORREIOS_CONFIG.idCorreios}:${CORREIOS_CONFIG.codigoAcesso}`).toString('base64');
    
    // Tentar autenticação com cartão de postagem
    try {
      console.log(`🔑 Tentando autenticação com cartão de postagem: ${CORREIOS_CONFIG.cartaoPostagem}`);
      
      const response = await axios({
        method: 'post',
        url: `${apiClient.defaults.baseURL}${ENDPOINTS.token.autenticaCartaoPostagem}`,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        data: {
          numero: CORREIOS_CONFIG.cartaoPostagem
        },
        timeout: 30000
      });
      
      if (response.data && response.data.token) {
        token = response.data.token;
        tokenExpiration = new Date(response.data.expiraEm);
        
        console.log('✅ Token obtido com sucesso (cartão de postagem)');
        console.log(`✅ Token expira em: ${tokenExpiration.toLocaleString()}`);
        console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
        
        // Configurar interceptor para adicionar token
        apiClient.interceptors.request.use(config => {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        });
        
        return true;
      }
    } catch (cartaoError) {
      console.error('⚠️ Falha na autenticação com cartão de postagem:', cartaoError.message);
      
      if (cartaoError.response) {
        console.error('⚠️ Status da resposta:', cartaoError.response.status);
        console.error('⚠️ Dados da resposta:', JSON.stringify(cartaoError.response.data || {}));
      }
      
      console.log('🔄 Tentando método de autenticação alternativo...');
    }
    
    // Autenticação direta
    const response = await axios({
      method: 'post',
      url: `${apiClient.defaults.baseURL}${ENDPOINTS.token.autentica}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      timeout: 30000
    });
    
    if (response.data && response.data.token) {
      token = response.data.token;
      tokenExpiration = new Date(response.data.expiraEm);
      
      console.log('✅ Token obtido com sucesso');
      console.log(`✅ Token expira em: ${tokenExpiration.toLocaleString()}`);
      console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
      
      // Configurar interceptor para adicionar token
      apiClient.interceptors.request.use(config => {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      });
      
      return true;
    } else {
      console.error('❌ Resposta sem token válido');
      console.error('❌ Dados da resposta:', JSON.stringify(response.data || {}));
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na autenticação:', error.message);
    
    if (error.response) {
      console.error('❌ Status da resposta:', error.response.status);
      console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
      
      if (error.response.status === 401) {
        console.error('❌ Credenciais inválidas. Verifique ID e código de acesso.');
      }
    }
    
    return false;
  }
}

// Função para criar prepostagem e gerar código de rastreio
async function gerarCodigoRastreio() {
  try {
    console.log('📦 Criando prepostagem para teste...');
    
    // Dados da prepostagem com todos os campos necessários para a API v1 de produção
    const dadosPrepostagem = {
      remetente: {
        nome: CORREIOS_CONFIG.remetente.nome || "Kimono Store",
        cnpj: CORREIOS_CONFIG.remetente.cnpj || "34028316000103", // CNPJ válido para teste
        inscricaoEstadual: CORREIOS_CONFIG.remetente.inscricaoEstadual || "1234567890",
        endereco: {
          logradouro: CORREIOS_CONFIG.remetente.endereco.logradouro || "Avenida Epitácio Pessoa",
          numero: CORREIOS_CONFIG.remetente.endereco.numero || "1000",
          complemento: CORREIOS_CONFIG.remetente.endereco.complemento || "",
          bairro: CORREIOS_CONFIG.remetente.endereco.bairro || "Tambaú",
          cidade: CORREIOS_CONFIG.remetente.endereco.cidade || "João Pessoa",
          uf: CORREIOS_CONFIG.remetente.endereco.uf || "PB",
          cep: CORREIOS_CONFIG.remetente.endereco.cep || "58039000"
        },
        telefone: CORREIOS_CONFIG.remetente.telefone || "8399999999", // Telefone válido para teste
        email: CORREIOS_CONFIG.remetente.email || "teste@kimonostore.com.br"
      },
      destinatario: {
        nome: "Cliente Teste",
        documento: "12345678909",
        telefone: "83999999999",
        email: "teste@exemplo.com",
        endereco: {
          logradouro: "Avenida Epitácio Pessoa",
          numero: "1000",
          complemento: "Apto 101",
          bairro: "Tambaú",
          cidade: "João Pessoa",
          uf: "PB",
          cep: "58039000"
        }
      },
      codigoServico: "03298", // Código do serviço (PAC)
      formatoObjeto: 2, // 1=Envelope, 2=Pacote, 3=Rolo/Prisma
      peso: 500, // Peso em gramas
      volumes: [{
        altura: 5, // cm
        largura: 25, // cm
        comprimento: 30, // cm
        peso: 500, // gramas
        tipoObjeto: 2, // Pacote
        valorDeclarado: 99.90
      }],
      servicosAdicionais: ["001"], // Valor declarado
      observacao: "Pedido de teste",
      objetosProibidos: false, // Declaração de que não contém objetos proibidos
      declaracaoConteudo: {
        itens: [
          {
            descricao: "Kimono",
            quantidade: 1,
            valor: 99.90
          }
        ]
      }
    };
    
    // Log da requisição para debug
    console.log('📝 Enviando requisição para:', `${apiClient.defaults.baseURL}${ENDPOINTS.prepostagem.criar}`);
    
    // Enviar requisição
    const response = await apiClient.post(ENDPOINTS.prepostagem.criar, dadosPrepostagem);
    
    if (response.data && response.data.codigoObjeto) {
      codigoRastreio = response.data.codigoObjeto;
      console.log('✅ Prepostagem criada com sucesso');
      console.log(`✅ Código de rastreio: ${codigoRastreio}`);
      console.log(`✅ Valor da postagem: R$ ${response.data.valorPostagem}`);
      console.log(`✅ Prazo de entrega: ${response.data.prazoEntrega} dias`);
      return true;
    } else {
      console.error('❌ Resposta sem código de rastreio válido');
      console.error('❌ Dados da resposta:', JSON.stringify(response.data || {}));
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao criar prepostagem:', error.message);
    
    if (error.response) {
      console.error('❌ Status da resposta:', error.response.status);
      console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
    }
    
    return false;
  }
}

// Função para rastrear objeto
async function rastrearObjeto(codigo) {
  try {
    console.log(`🔍 Rastreando objeto: ${codigo}`);
    
    const response = await apiClient.get(`${ENDPOINTS.rastreamento.consulta}/${codigo}`);
    
    if (response.data) {
      console.log('✅ Rastreamento obtido com sucesso');
      console.log(`✅ Status: ${response.data.status || 'N/A'}`);
      
      if (response.data.eventos && response.data.eventos.length > 0) {
        console.log('📋 Eventos de rastreamento:');
        response.data.eventos.forEach((evento, index) => {
          console.log(`   ${index + 1}. [${evento.data} ${evento.hora}] ${evento.descricao} - ${evento.local}`);
        });
      } else {
        console.log('⚠️ Nenhum evento de rastreamento encontrado');
      }
      
      return true;
    } else {
      console.error('❌ Resposta sem dados de rastreamento válidos');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao rastrear objeto:', error.message);
    
    if (error.response) {
      console.error('❌ Status da resposta:', error.response.status);
      console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
      
      if (error.response.status === 404) {
        console.error('❌ Objeto não encontrado. O código pode ser inválido ou muito recente.');
      } else if (error.response.status === 403) {
        console.error('❌ Acesso não autorizado. Seu contrato pode não ter permissão para usar esta API.');
      }
    }
    
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando teste de integração com os Correios em produção...');
  
  // Validar configuração
  if (!validarConfiguracao()) {
    console.error('❌ Teste abortado devido a configuração incompleta');
    return;
  }
  
  // Autenticar
  if (!await autenticar()) {
    console.error('❌ Teste abortado devido a falha na autenticação');
    return;
  }
  
  // Gerar código de rastreio
  if (!await gerarCodigoRastreio()) {
    console.error('❌ Teste abortado devido a falha na geração de código de rastreio');
    return;
  }
  
  // Rastrear objeto
  if (codigoRastreio) {
    console.log('⚠️ Rastreamento pode não mostrar eventos imediatamente após a criação');
    await rastrearObjeto(codigoRastreio);
  }
  
  console.log('✅ Teste de integração concluído');
}

// Executar teste
main().catch(error => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
}); 