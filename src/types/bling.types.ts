// Tipos de dados para integração com Bling API v3

// Status de pedido no Bling
export type BlingOrderStatus = 
  | 'pendente'
  | 'em_andamento' 
  | 'atendido'
  | 'cancelado'
  | 'em_aberto'
  | 'vencido';

// Tipos de situação do pedido
export type BlingOrderSituation = 
  | 'em_aberto'
  | 'em_andamento'
  | 'atendido'
  | 'cancelado'
  | 'em_digitacao';

// Dados do cliente no Bling
export interface BlingCustomer {
  id?: number;
  nome: string;
  codigo?: string;
  documento?: string;
  inscricaoEstadual?: string;
  endereco?: {
    endereco: string;
    numero?: string;
    complemento?: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
  };
  telefone?: string;
  celular?: string;
  email?: string;
  tipoPessoa?: 'F' | 'J'; // Física ou Jurídica
}

// Item do pedido no Bling
export interface BlingOrderItem {
  produto: {
    id?: number;
    codigo?: string;
    nome: string;
  };
  quantidade: number;
  valor: number;
  desconto?: number;
}

// Dados de transporte
export interface BlingShipping {
  transportadora?: {
    nome?: string;
    cnpj?: string;
  };
  volumes?: Array<{
    servico?: string;
    codigoRastreamento?: string;
  }>;
  etiqueta?: {
    nome?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
    bairro?: string;
  };
}

// Dados do pedido no Bling
export interface BlingOrder {
  id?: number;
  numero?: string;
  numeroLoja?: string;
  data?: string;
  dataSaida?: string;
  dataPrevista?: string;
  totalProdutos?: number;
  totalVenda?: number;
  situacao?: BlingOrderSituation;
  loja?: number;
  numeroPedidoLoja?: string;
  checkoutType?: string;
  cliente: BlingCustomer;
  itens: BlingOrderItem[];
  parcelas?: Array<{
    dataVencimento: string;
    valor: number;
    obs?: string;
    formaPagamento?: {
      id: number;
      descricao?: string;
    };
  }>;
  transporte?: BlingShipping;
  observacoes?: string;
  observacaoInterna?: string;
  desconto?: number;
  outrasDespesas?: number;
  intermediador?: {
    cnpj?: string;
    nomeUsuario?: string;
  };
  rastreamento?: Array<{
    codigo: string;
    url?: string;
  }>;
}

// Dados do produto no Bling v3
export interface BlingProduct {
  id?: number;
  nome: string;
  codigo?: string;
  preco?: number;
  tipo?: 'P' | 'S'; // Produto ou Serviço
  situacao?: 'A' | 'I'; // Ativo ou Inativo
  formato?: 'S' | 'V' | 'E'; // Simples, Variação, Estrutura
  descricaoCurta?: string;
  descricaoComplementar?: string;
  unidade?: string;
  pesoLiquido?: number;
  pesoBruto?: number;
  volumes?: number;
  itensPorCaixa?: number;
  gtin?: string;
  gtinEmbalagem?: string;
  tipoProducao?: string;
  condicao?: number;
  freteGratis?: boolean;
  marca?: string;
  descricaoFornecedor?: string;
  categoria?: {
    id?: number;
    descricao?: string;
  };
  estoque?: {
    minimo?: number;
    maximo?: number;
    crossdocking?: number;
    localizacao?: string;
  };
  actionEstoque?: 'A' | 'S' | 'T'; // Alterar, Subtrair, Total
  informacoesAdicionais?: {
    videoUrl?: string;
    imagemURL?: string;
  };
  dimensoes?: {
    largura?: number;
    altura?: number;
    profundidade?: number;
    unidadeMedida?: number;
  };
  tributacao?: {
    origem?: number;
    nFCI?: string;
    ncm?: string;
    cest?: string;
    codigoListaServicos?: string;
    spedTipoItem?: string;
    codigoItem?: string;
    percentualTributos?: number;
    valorBaseStRetido?: number;
    valorStRetido?: number;
    valorICMSSubstituto?: number;
    codigoExcecaoTipi?: string;
    classeEnquadramentoIpi?: string;
    cnpjProdutor?: string;
    codigoSeloIpi?: string;
    quantidadeSeloIpi?: number;
    codigoEnquadramentoLegal?: string;
    cstIcms?: string;
    csosn?: string;
  };
  midia?: Array<{
    url: string;
    type: number;
  }>;
  linhaProduto?: {
    id: number;
  };
  estrutura?: {
    tipoEstoque: string;
    lancamentoEstoque: string;
    componentes?: Array<{
      produto: {
        id: number;
      };
      quantidade: number;
    }>;
  };
  camposPersonalizados?: Array<{
    idCampoPersonalizado: number;
    idVinculo?: number;
    valor?: string;
    item?: string;
  }>;
  variacoes?: Array<{
    id?: number;
    nome: string;
    codigo?: string;
    gtin?: string;
    preco?: number;
    promoCasadinha?: boolean;
    produtoPai?: {
      cloneInfo: boolean;
    };
    deposito?: {
      id: number;
      estoque?: number;
    };
  }>;
}

// Categoria do produto
export interface BlingCategory {
  id?: number;
  descricao: string;
  idCategoriaPai?: number;
}

// Dados de estoque
export interface BlingStock {
  produto: {
    id: number;
  };
  deposito?: {
    id: number;
  };
  operacao: 'B' | 'S' | 'A'; // Balanço, Saída, Entrada
  preco?: number;
  custo?: number;
  quantidade: number;
  observacoes?: string;
}

// Resposta da API do Bling v3
export interface BlingApiResponse<T> {
  data: T;
}

// Lista com paginação v3
export interface BlingPaginatedResponse<T> {
  data: T[];
  pagina: number;
  limite: number;
  total: number;
}

// Dados de webhook
export interface BlingWebhookData {
  evento: string;
  dados: {
    id: number;
    numero?: string;
    situacao?: string;
    [key: string]: any;
  };
}

// Token de acesso OAuth
export interface BlingToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Dados para renovação de token
export interface BlingTokenRefresh {
  grant_type: 'refresh_token';
  refresh_token: string;
}

// Mapeamento de status
export interface BlingStatusMapping {
  [key: string]: string;
}

// Resposta de erro do Bling
export interface BlingError {
  codigo: number;
  mensagem: string;
  tipo: string;
}

// Configurações de sincronização
export interface BlingSyncConfig {
  syncProducts: boolean;
  syncOrders: boolean;
  syncStock: boolean;
  syncCustomers: boolean;
  autoUpdateStock: boolean;
  defaultCategory?: number;
  defaultStore?: number;
} 