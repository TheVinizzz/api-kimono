export const CORREIOS_CONFIG = {
  // Ambiente: PRODUCAO ou HOMOLOGACAO
  ambiente: process.env.CORREIOS_AMBIENTE || 'HOMOLOGACAO',
  
  // Credenciais de acesso (obter junto aos Correios)
  idCorreios: process.env.CORREIOS_ID || '',
  codigoAcesso: process.env.CORREIOS_CODIGO_ACESSO || '',
  contrato: process.env.CORREIOS_CONTRATO || '',
  
  // Cartão de postagem (para prepostagem)
  cartaoPostagem: process.env.CORREIOS_CARTAO_POSTAGEM || '',
  
  // Configurações da empresa remetente
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
  },
  
  // Configurações de serviços padrão
  servicosPadrao: {
    pac: '03298', // PAC Contrato
    sedex: '03220', // SEDEX Contrato
    sedexHoje: '03204' // SEDEX Hoje
  },
  
  // URLs da API
  urls: {
    homologacao: 'https://apihom.correios.com.br',
    producao: 'https://api.correios.com.br'
  }
};

// Função para validar configurações
export function validateCorreiosConfig(): boolean {
  const required = [
    'CORREIOS_ID',
    'CORREIOS_CODIGO_ACESSO', 
    'CORREIOS_CONTRATO',
    'CORREIOS_CARTAO_POSTAGEM',
    'CORREIOS_REMETENTE_CNPJ',
    'CORREIOS_REMETENTE_CEP'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Configurações dos Correios faltando:', missing);
    return false;
  }
  
  return true;
}

// Tipos de objetos dos Correios
export enum TiposObjeto {
  Envelope = 1,
  Pacote = 2,
  RoloPrisma = 3
}

// Serviços adicionais
export enum ServicosAdicionais {
  AvisoRecebimento = '025',
  MaoPropria = '002',
  ValorDeclarado = '019',
  Devolucao = '067'
} 