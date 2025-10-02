"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServicosAdicionais = exports.TiposObjeto = exports.CORREIOS_CONFIG = void 0;
exports.validateCorreiosConfig = validateCorreiosConfig;
exports.CORREIOS_CONFIG = {
    // Ambiente: PRODUCAO ou HOMOLOGACAO
    ambiente: process.env.CORREIOS_AMBIENTE || 'PRODUCAO',
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
            cep: process.env.CORREIOS_REMETENTE_CEP ? cleanCEP(process.env.CORREIOS_REMETENTE_CEP) : ''
        },
        telefone: process.env.CORREIOS_REMETENTE_TELEFONE ? cleanPhone(process.env.CORREIOS_REMETENTE_TELEFONE) : '',
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
        producao: 'https://api.correios.com.br',
        cwsHomologacao: 'https://cwshom.correios.com.br/api',
        cwsProducao: 'https://cws.correios.com.br/api'
    },
    // Endpoints específicos
    endpoints: {
        token: {
            autentica: '/token/v1/autentica',
            autenticaCartaoPostagem: '/token/v1/autentica/cartaopostagem'
        },
        cep: {
            consulta: '/cep/v1/enderecos',
            consultaV2: '/cep/v2/enderecos', // Novo endpoint v2 de consulta de CEP
            consultaCepUnico: '/cep/v2/enderecos/', // Endpoint para consulta de um CEP específico (adicionar o CEP ao final)
            listaUfs: '/cep/v1/ufs',
            consultaUf: '/cep/v1/ufs/', // Adicionar a UF ao final
            listaLocalidades: '/cep/v1/localidades',
            listaLocalidadesUf: '/cep/v1/localidades/' // Adicionar a UF ao final
        },
        prepostagem: {
            criar: '/prepostagem/v1/prepostagens' // Endpoint correto para produção
        },
        rastreamento: {
            consulta: '/srorastro/v1/objetos'
        }
    }
};
// Função para limpar o CEP removendo caracteres não numéricos
function cleanCEP(cep) {
    return cep.replace(/\D/g, '');
}
// Função para limpar o telefone removendo caracteres não numéricos
function cleanPhone(phone) {
    return phone.replace(/\D/g, '');
}
// Função para validar configurações
function validateCorreiosConfig() {
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
var TiposObjeto;
(function (TiposObjeto) {
    TiposObjeto[TiposObjeto["Envelope"] = 1] = "Envelope";
    TiposObjeto[TiposObjeto["Pacote"] = 2] = "Pacote";
    TiposObjeto[TiposObjeto["RoloPrisma"] = 3] = "RoloPrisma";
})(TiposObjeto || (exports.TiposObjeto = TiposObjeto = {}));
// Serviços adicionais
var ServicosAdicionais;
(function (ServicosAdicionais) {
    ServicosAdicionais["AvisoRecebimento"] = "025";
    ServicosAdicionais["MaoPropria"] = "002";
    ServicosAdicionais["ValorDeclarado"] = "019";
    ServicosAdicionais["Devolucao"] = "067";
})(ServicosAdicionais || (exports.ServicosAdicionais = ServicosAdicionais = {}));
