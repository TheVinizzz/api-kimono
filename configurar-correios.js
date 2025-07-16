/**
 * Script interativo para configurar as variáveis de ambiente dos Correios
 * 
 * Este script ajuda a configurar corretamente todas as variáveis de ambiente
 * necessárias para a integração com os Correios.
 * 
 * Uso: node configurar-correios.js
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente existentes
dotenv.config();

// Criar interface de leitura
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Variáveis para armazenar configurações
const config = {
  ambiente: process.env.CORREIOS_AMBIENTE || 'PRODUCAO',
  idCorreios: process.env.CORREIOS_ID || '',
  codigoAcesso: process.env.CORREIOS_CODIGO_ACESSO || '',
  contrato: process.env.CORREIOS_CONTRATO || '',
  cartaoPostagem: process.env.CORREIOS_CARTAO_POSTAGEM || '',
  remetente: {
    nome: process.env.CORREIOS_REMETENTE_NOME || 'KIMONO STORE',
    razaoSocial: process.env.CORREIOS_REMETENTE_RAZAO || 'KIMONO COMERCIO LTDA',
    cnpj: process.env.CORREIOS_REMETENTE_CNPJ || '',
    inscricaoEstadual: process.env.CORREIOS_REMETENTE_IE || '',
    endereco: {
      logradouro: process.env.CORREIOS_REMETENTE_LOGRADOURO || '',
      numero: process.env.CORREIOS_REMETENTE_NUMERO || '',
      complemento: process.env.CORREIOS_REMETENTE_COMPLEMENTO || '',
      bairro: process.env.CORREIOS_REMETENTE_BAIRRO || '',
      cidade: process.env.CORREIOS_REMETENTE_CIDADE || '',
      uf: process.env.CORREIOS_REMETENTE_UF || '',
      cep: process.env.CORREIOS_REMETENTE_CEP || ''
    },
    telefone: process.env.CORREIOS_REMETENTE_TELEFONE || '',
    email: process.env.CORREIOS_REMETENTE_EMAIL || ''
  }
};

// Função para perguntar com valor padrão
function perguntar(pergunta, valorPadrao) {
  return new Promise((resolve) => {
    const perguntaCompleta = valorPadrao 
      ? `${pergunta} (atual: ${valorPadrao}): ` 
      : `${pergunta}: `;
    
    rl.question(perguntaCompleta, (resposta) => {
      resolve(resposta.trim() || valorPadrao || '');
    });
  });
}

// Função para validar CEP
function validarCEP(cep) {
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.length === 8;
}

// Função para validar CNPJ
function validarCNPJ(cnpj) {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo.length === 14;
}

// Função para validar UF
function validarUF(uf) {
  const ufsValidas = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 
                      'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO'];
  return ufsValidas.includes(uf.toUpperCase());
}

// Função para salvar configurações no arquivo .env
function salvarConfiguracoes() {
  // Carregar arquivo .env existente
  const envPath = path.resolve(process.cwd(), '.env');
  let envConteudo = '';
  
  try {
    if (fs.existsSync(envPath)) {
      envConteudo = fs.readFileSync(envPath, 'utf8');
    }
  } catch (err) {
    console.error('Erro ao ler arquivo .env:', err);
  }
  
  // Converter conteúdo para objeto
  const envLinhas = envConteudo.split('\n');
  const envObj = {};
  
  envLinhas.forEach(linha => {
    // Ignorar comentários e linhas vazias
    if (linha.trim() && !linha.startsWith('#')) {
      const match = linha.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, chave, valor] = match;
        envObj[chave.trim()] = valor.trim();
      }
    }
  });
  
  // Atualizar com novas configurações
  envObj['CORREIOS_AMBIENTE'] = config.ambiente;
  envObj['CORREIOS_ID'] = config.idCorreios;
  envObj['CORREIOS_CODIGO_ACESSO'] = config.codigoAcesso;
  envObj['CORREIOS_CONTRATO'] = config.contrato;
  envObj['CORREIOS_CARTAO_POSTAGEM'] = config.cartaoPostagem;
  
  envObj['CORREIOS_REMETENTE_NOME'] = config.remetente.nome;
  envObj['CORREIOS_REMETENTE_RAZAO'] = config.remetente.razaoSocial;
  envObj['CORREIOS_REMETENTE_CNPJ'] = config.remetente.cnpj;
  envObj['CORREIOS_REMETENTE_IE'] = config.remetente.inscricaoEstadual;
  
  envObj['CORREIOS_REMETENTE_LOGRADOURO'] = config.remetente.endereco.logradouro;
  envObj['CORREIOS_REMETENTE_NUMERO'] = config.remetente.endereco.numero;
  envObj['CORREIOS_REMETENTE_COMPLEMENTO'] = config.remetente.endereco.complemento;
  envObj['CORREIOS_REMETENTE_BAIRRO'] = config.remetente.endereco.bairro;
  envObj['CORREIOS_REMETENTE_CIDADE'] = config.remetente.endereco.cidade;
  envObj['CORREIOS_REMETENTE_UF'] = config.remetente.endereco.uf;
  envObj['CORREIOS_REMETENTE_CEP'] = config.remetente.endereco.cep;
  
  envObj['CORREIOS_REMETENTE_TELEFONE'] = config.remetente.telefone;
  envObj['CORREIOS_REMETENTE_EMAIL'] = config.remetente.email;
  
  // Converter de volta para string
  let novoConteudo = '';
  Object.entries(envObj).forEach(([chave, valor]) => {
    novoConteudo += `${chave}=${valor}\n`;
  });
  
  // Salvar arquivo
  try {
    fs.writeFileSync(envPath, novoConteudo);
    console.log(`✅ Configurações salvas com sucesso em ${envPath}`);
    return true;
  } catch (err) {
    console.error('❌ Erro ao salvar arquivo .env:', err);
    return false;
  }
}

// Função principal
async function configurarCorreios() {
  console.log('🚀 Configuração da Integração com os Correios');
  console.log('============================================');
  console.log('Este assistente irá ajudá-lo a configurar as variáveis de ambiente necessárias');
  console.log('para a integração com os Correios. Pressione ENTER para manter os valores atuais.\n');
  
  // 1. Configurações básicas
  console.log('\n📋 CONFIGURAÇÕES BÁSICAS');
  console.log('------------------------');
  
  config.ambiente = await perguntar('Ambiente (PRODUCAO ou HOMOLOGACAO)', config.ambiente);
  config.idCorreios = await perguntar('ID dos Correios', config.idCorreios);
  config.codigoAcesso = await perguntar('Código de Acesso', config.codigoAcesso);
  config.contrato = await perguntar('Número do Contrato', config.contrato);
  config.cartaoPostagem = await perguntar('Cartão de Postagem', config.cartaoPostagem);
  
  // 2. Dados do remetente
  console.log('\n📋 DADOS DO REMETENTE');
  console.log('---------------------');
  
  config.remetente.nome = await perguntar('Nome do Remetente', config.remetente.nome);
  config.remetente.razaoSocial = await perguntar('Razão Social', config.remetente.razaoSocial);
  
  // CNPJ com validação
  let cnpjValido = false;
  while (!cnpjValido) {
    config.remetente.cnpj = await perguntar('CNPJ (somente números)', config.remetente.cnpj);
    cnpjValido = validarCNPJ(config.remetente.cnpj);
    if (!cnpjValido) {
      console.log('❌ CNPJ inválido. Deve conter 14 dígitos numéricos.');
    }
  }
  
  config.remetente.inscricaoEstadual = await perguntar('Inscrição Estadual', config.remetente.inscricaoEstadual);
  
  // 3. Endereço do remetente
  console.log('\n📋 ENDEREÇO DO REMETENTE');
  console.log('------------------------');
  
  config.remetente.endereco.logradouro = await perguntar('Logradouro', config.remetente.endereco.logradouro);
  config.remetente.endereco.numero = await perguntar('Número', config.remetente.endereco.numero);
  config.remetente.endereco.complemento = await perguntar('Complemento (opcional)', config.remetente.endereco.complemento);
  config.remetente.endereco.bairro = await perguntar('Bairro', config.remetente.endereco.bairro);
  config.remetente.endereco.cidade = await perguntar('Cidade', config.remetente.endereco.cidade);
  
  // UF com validação
  let ufValida = false;
  while (!ufValida) {
    config.remetente.endereco.uf = await perguntar('UF (2 letras)', config.remetente.endereco.uf);
    ufValida = validarUF(config.remetente.endereco.uf);
    if (!ufValida) {
      console.log('❌ UF inválida. Use a sigla de 2 letras do estado.');
    } else {
      config.remetente.endereco.uf = config.remetente.endereco.uf.toUpperCase();
    }
  }
  
  // CEP com validação
  let cepValido = false;
  while (!cepValido) {
    config.remetente.endereco.cep = await perguntar('CEP (somente números)', config.remetente.endereco.cep);
    cepValido = validarCEP(config.remetente.endereco.cep);
    if (!cepValido) {
      console.log('❌ CEP inválido. Deve conter 8 dígitos numéricos.');
    }
  }
  
  // 4. Contato do remetente
  console.log('\n📋 CONTATO DO REMETENTE');
  console.log('-----------------------');
  
  config.remetente.telefone = await perguntar('Telefone (somente números)', config.remetente.telefone);
  config.remetente.email = await perguntar('Email', config.remetente.email);
  
  // 5. Salvar configurações
  console.log('\n📝 RESUMO DAS CONFIGURAÇÕES');
  console.log('--------------------------');
  console.log(JSON.stringify(config, null, 2));
  
  const confirmar = await perguntar('Deseja salvar estas configurações? (s/n)', 's');
  
  if (confirmar.toLowerCase() === 's') {
    if (salvarConfiguracoes()) {
      console.log('\n✅ Configuração concluída com sucesso!');
      console.log('🔍 Você pode testar a integração executando: node test-correios-producao.js');
    } else {
      console.log('\n❌ Erro ao salvar configurações.');
    }
  } else {
    console.log('\n❌ Configuração cancelada pelo usuário.');
  }
  
  rl.close();
}

// Iniciar configuração
configurarCorreios().catch(err => {
  console.error('❌ Erro inesperado:', err);
  rl.close();
}); 