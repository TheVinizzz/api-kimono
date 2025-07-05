// Tipos para integração com a API dos Correios

export interface CorreiosEnderecoRequest {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface CorreiosDestinatarioRequest {
  nome: string;
  email?: string;
  telefone?: string;
  documento: string; // CPF ou CNPJ
  endereco: CorreiosEnderecoRequest;
}

export interface CorreiosRemetenteRequest {
  nome: string;
  cnpj: string;
  inscricaoEstadual?: string;
  endereco: CorreiosEnderecoRequest;
  telefone?: string;
  email?: string;
}

export interface CorreiosDimensoes {
  altura: number; // em cm
  largura: number; // em cm  
  comprimento: number; // em cm
  peso: number; // em gramas
}

export interface CorreiosVolume extends CorreiosDimensoes {
  tipoObjeto: number; // 1=Envelope, 2=Pacote, 3=Rolo/Prisma
  valorDeclarado?: number;
}

export interface CorreiosPrepostagemRequest {
  remetente: CorreiosRemetenteRequest;
  destinatario: CorreiosDestinatarioRequest;
  servico: string; // código do serviço (PAC, SEDEX, etc)
  volumes: CorreiosVolume[];
  servicosAdicionais?: string[];
  numeroNotaFiscal?: string;
  valorNotaFiscal?: number;
  observacao?: string;
}

export interface CorreiosPrepostagemResponse {
  id: string; // ID da prepostagem
  codigoObjeto: string; // Código de rastreamento (BR123456789BR)
  valorPostagem: number;
  prazoEntrega: number;
  dataPrevisaoPostagem: string;
  urlEtiqueta?: string;
  erro?: string;
  mensagem?: string;
}

export interface CorreiosRastreamentoEvento {
  data: string;
  hora: string;
  local: string;
  codigo: string;
  descricao: string;
  detalhe?: string;
  recebedor?: string;
  documento?: string;
}

export interface CorreiosRastreamentoResponse {
  codigo: string;
  eventos: CorreiosRastreamentoEvento[];
  modalidade: string;
  tipoPostal: {
    categoria: string;
    nome: string;
    sigla: string;
  };
  habilitaAutoDeclaracao: boolean;
  permiteEncargoImportacao: boolean;
  habilitaPercorridaCarteiro: boolean;
  bloqueioObjeto: boolean;
  possuiLocker: boolean;
  habilitaLocker: boolean;
  status: string;
}

export interface CorreiosCalculoFreteRequest {
  cepOrigem: string;
  cepDestino: string;
  peso: number; // em gramas
  comprimento: number; // em cm
  altura: number; // em cm
  largura: number; // em cm
  diametro?: number; // em cm
  servicoCodigo: string;
  valorDeclarado?: number;
}

export interface CorreiosCalculoFreteResponse {
  servico: {
    codigo: string;
    nome: string;
  };
  prazoEntrega: number;
  valor: number;
  valorSemAdicionais: number;
  entregaDomiciliar: boolean;
  entregaSabado: boolean;
  erro?: string;
  msgErro?: string;
}

export interface CorreiosEtiquetaRequest {
  idPrepostagem: string;
  codigoObjeto: string;
}

export interface CorreiosEtiquetaResponse {
  etiqueta: string; // Base64 da etiqueta em PDF
  erro?: string;
  mensagem?: string;
}

// Status de rastreamento padronizados
export enum StatusRastreamento {
  POSTADO = 'POSTADO',
  EM_TRANSITO = 'EM_TRANSITO', 
  SAIU_PARA_ENTREGA = 'SAIU_PARA_ENTREGA',
  ENTREGUE = 'ENTREGUE',
  TENTATIVA_ENTREGA = 'TENTATIVA_ENTREGA',
  AGUARDANDO_RETIRADA = 'AGUARDANDO_RETIRADA',
  DEVOLVIDO = 'DEVOLVIDO',
  EXTRAVIADO = 'EXTRAVIADO'
}

// Configurações da API dos Correios
export interface CorreiosApiConfig {
  ambiente: 'PRODUCAO' | 'HOMOLOGACAO';
  idCorreios: string;
  codigoAcesso: string;
  contrato: string;
  cartaoPostagem: string;
}

// Resposta de autenticação
export interface CorreiosTokenResponse {
  token: string;
  expiresIn: number;
  tokenType: string;
  ambiente: string;
} 