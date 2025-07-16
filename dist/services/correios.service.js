"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correiosService = exports.CorreiosService = void 0;
const axios_1 = __importDefault(require("axios"));
const correios_1 = require("../config/correios");
class CorreiosService {
    constructor() {
        this.token = null;
        this.tokenExpiration = null;
        this.config = {
            ambiente: correios_1.CORREIOS_CONFIG.ambiente,
            idCorreios: correios_1.CORREIOS_CONFIG.idCorreios,
            codigoAcesso: correios_1.CORREIOS_CONFIG.codigoAcesso,
            contrato: correios_1.CORREIOS_CONFIG.contrato,
            cartaoPostagem: correios_1.CORREIOS_CONFIG.cartaoPostagem
        };
        const baseURL = this.config.ambiente === 'PRODUCAO'
            ? correios_1.CORREIOS_CONFIG.urls.producao
            : correios_1.CORREIOS_CONFIG.urls.homologacao;
        this.apiClient = axios_1.default.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        // Interceptor para adicionar token automaticamente
        this.apiClient.interceptors.request.use((config) => __awaiter(this, void 0, void 0, function* () {
            const token = yield this.getValidToken();
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        }));
    }
    /**
     * Obtém um token válido, renovando se necessário
     */
    getValidToken() {
        return __awaiter(this, void 0, void 0, function* () {
            // Verificar se já temos um token válido
            if (this.token && this.tokenExpiration) {
                // Adicionar 5 minutos de margem de segurança
                const now = new Date();
                const expirationWithMargin = new Date(this.tokenExpiration);
                expirationWithMargin.setMinutes(expirationWithMargin.getMinutes() - 5);
                if (now < expirationWithMargin) {
                    return this.token;
                }
            }
            // Se não temos um token válido, autenticar novamente
            yield this.authenticate();
            return this.token;
        });
    }
    /**
     * Autentica na API dos Correios
     */
    authenticate() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verificar se as credenciais estão presentes
                if (!this.config.idCorreios || !this.config.codigoAcesso) {
                    console.error('❌ Credenciais incompletas. Verifique as variáveis de ambiente:');
                    console.error('- CORREIOS_ID');
                    console.error('- CORREIOS_CODIGO_ACESSO');
                    throw new Error('Credenciais dos Correios incompletas');
                }
                // Criar credenciais em formato Base64 para autenticação Basic
                const credentials = Buffer.from(`${this.config.idCorreios}:${this.config.codigoAcesso}`).toString('base64');
                console.log(`🔑 Autenticando com ID: ${this.config.idCorreios}`);
                console.log(`🔑 URL base: ${this.apiClient.defaults.baseURL}`);
                console.log(`🔑 Ambiente: ${this.config.ambiente}`);
                // Tentar primeiro autenticação com cartão de postagem (que tem acesso à API de CEP)
                if (this.config.cartaoPostagem) {
                    try {
                        console.log(`🔑 Tentando autenticação com cartão de postagem: ${this.config.cartaoPostagem}`);
                        const response = yield (0, axios_1.default)({
                            method: 'post',
                            url: `${this.apiClient.defaults.baseURL}${correios_1.CORREIOS_CONFIG.endpoints.token.autenticaCartaoPostagem}`,
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Authorization': `Basic ${credentials}`
                            },
                            data: {
                                numero: this.config.cartaoPostagem
                            },
                            timeout: 30000
                        });
                        if (response.data && response.data.token) {
                            this.token = response.data.token;
                            this.tokenExpiration = new Date(response.data.expiraEm);
                            console.log('✅ Token dos Correios obtido com sucesso (cartão de postagem)');
                            console.log(`✅ Token expira em: ${this.tokenExpiration.toLocaleString()}`);
                            console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
                            return;
                        }
                    }
                    catch (cartaoError) {
                        console.error('⚠️ Falha na autenticação com cartão de postagem:', cartaoError.message);
                        if (cartaoError.response) {
                            console.error('⚠️ Status da resposta:', cartaoError.response.status);
                            console.error('⚠️ Dados da resposta:', JSON.stringify(cartaoError.response.data || {}));
                        }
                        console.log('🔄 Tentando método de autenticação alternativo...');
                    }
                }
                // Autenticação direta - método alternativo
                const response = yield (0, axios_1.default)({
                    method: 'post',
                    url: `${this.apiClient.defaults.baseURL}${correios_1.CORREIOS_CONFIG.endpoints.token.autentica}`,
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Basic ${credentials}`
                    },
                    timeout: 30000
                });
                if (response.data && response.data.token) {
                    this.token = response.data.token;
                    this.tokenExpiration = new Date(response.data.expiraEm);
                    console.log('✅ Token dos Correios obtido com sucesso');
                    console.log(`✅ Token expira em: ${this.tokenExpiration.toLocaleString()}`);
                    console.log(`✅ Ambiente retornado: ${response.data.ambiente || 'N/A'}`);
                    return;
                }
                else {
                    console.error('❌ Resposta sem token válido');
                    console.error('❌ Dados da resposta:', JSON.stringify(response.data || {}));
                    throw new Error('Resposta sem token válido');
                }
            }
            catch (error) {
                console.error('❌ Erro na autenticação:', error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                    if (error.response.status === 401) {
                        console.error('❌ Credenciais inválidas. Verifique ID e código de acesso.');
                    }
                }
                throw new Error(`Falha na autenticação: ${error.message}`);
            }
        });
    }
    /**
     * Cria uma prepostagem e gera código de rastreio
     */
    criarPrepostagem(dadosPrepostagem) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                console.log('📦 Criando prepostagem nos Correios...');
                const response = yield this.apiClient.post(correios_1.CORREIOS_CONFIG.endpoints.prepostagem.criar, dadosPrepostagem);
                const resultado = response.data;
                console.log('✅ Prepostagem criada com sucesso:', resultado.codigoObjeto);
                return resultado;
            }
            catch (error) {
                console.error('❌ Erro ao criar prepostagem:', error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                }
                // Retorna resposta de erro padronizada
                return {
                    id: '',
                    codigoObjeto: '',
                    valorPostagem: 0,
                    prazoEntrega: 0,
                    dataPrevisaoPostagem: '',
                    erro: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.erro) || 'ERRO_INTERNO',
                    mensagem: ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.mensagem) || 'Erro ao criar prepostagem nos Correios'
                };
            }
        });
    }
    /**
     * Rastreia um objeto pelos Correios
     */
    rastrearObjeto(codigoRastreio) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔍 Rastreando objeto: ${codigoRastreio}`);
                const response = yield this.apiClient.get(`${correios_1.CORREIOS_CONFIG.endpoints.rastreamento.consulta}/${codigoRastreio}`);
                return response.data;
            }
            catch (error) {
                console.error('❌ Erro ao rastrear objeto:', error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                    if (error.response.status === 403) {
                        console.error('❌ Acesso não autorizado. Seu contrato pode não ter permissão para usar esta API.');
                    }
                }
                return null;
            }
        });
    }
    /**
     * Consulta CEP pelos Correios usando a API v2
     */
    consultarCEP(cep) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Limpar CEP (remover caracteres não numéricos)
                const cepLimpo = cep.replace(/\D/g, '');
                if (cepLimpo.length !== 8) {
                    throw new Error('CEP inválido. Deve conter 8 dígitos numéricos.');
                }
                console.log(`🔍 Consultando CEP: ${cepLimpo}`);
                const response = yield this.apiClient.get(`${correios_1.CORREIOS_CONFIG.endpoints.cep.consultaCepUnico}${cepLimpo}`);
                return response.data;
            }
            catch (error) {
                console.error('❌ Erro ao consultar CEP:', error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                    if (error.response.status === 403) {
                        console.error('❌ Acesso não autorizado. Seu contrato pode não ter permissão para usar esta API.');
                        console.error('💡 Entre em contato com os Correios para habilitar o acesso à API de CEP.');
                    }
                }
                return null;
            }
        });
    }
    /**
     * Consulta múltiplos CEPs pelos Correios usando a API v2
     */
    consultarMultiplosCEPs(ceps) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Limpar CEPs (remover caracteres não numéricos)
                const cepsLimpos = ceps.map(cep => cep.replace(/\D/g, ''));
                // Validar CEPs
                for (const cep of cepsLimpos) {
                    if (cep.length !== 8) {
                        throw new Error(`CEP inválido: ${cep}. Deve conter 8 dígitos numéricos.`);
                    }
                }
                // Verificar limite de CEPs
                if (cepsLimpos.length > 20) {
                    throw new Error('Limite máximo de 20 CEPs por consulta.');
                }
                console.log(`🔍 Consultando ${cepsLimpos.length} CEPs: ${cepsLimpos.join(', ')}`);
                // Construir query string
                const queryParams = new URLSearchParams();
                cepsLimpos.forEach(cep => queryParams.append('cep', cep));
                const response = yield this.apiClient.get(`${correios_1.CORREIOS_CONFIG.endpoints.cep.consultaV2}?${queryParams.toString()}`);
                return response.data;
            }
            catch (error) {
                console.error('❌ Erro ao consultar múltiplos CEPs:', error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                    if (error.response.status === 403) {
                        console.error('❌ Acesso não autorizado. Seu contrato pode não ter permissão para usar esta API.');
                    }
                }
                return null;
            }
        });
    }
    /**
     * Lista todas as UFs e suas faixas de CEP
     */
    listarUFs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔍 Listando todas as UFs...');
                const response = yield this.apiClient.get(correios_1.CORREIOS_CONFIG.endpoints.cep.listaUfs);
                return response.data;
            }
            catch (error) {
                console.error('❌ Erro ao listar UFs:', error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                }
                return null;
            }
        });
    }
    /**
     * Consulta uma UF específica e suas faixas de CEP
     */
    consultarUF(uf) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Converter para maiúsculas
                const ufUpperCase = uf.toUpperCase();
                // Validar UF
                const ufsValidas = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
                    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO'];
                if (!ufsValidas.includes(ufUpperCase)) {
                    throw new Error(`UF inválida: ${uf}. Deve ser uma UF brasileira válida.`);
                }
                console.log(`🔍 Consultando UF: ${ufUpperCase}`);
                const response = yield this.apiClient.get(`${correios_1.CORREIOS_CONFIG.endpoints.cep.consultaUf}${ufUpperCase}`);
                return response.data;
            }
            catch (error) {
                console.error(`❌ Erro ao consultar UF ${uf}:`, error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                }
                return null;
            }
        });
    }
    /**
     * Lista localidades com filtros opcionais
     */
    listarLocalidades() {
        return __awaiter(this, arguments, void 0, function* (params = {}) {
            try {
                console.log('🔍 Listando localidades...');
                // Construir query string com os parâmetros
                const queryParams = new URLSearchParams();
                if (params.uf) {
                    queryParams.append('uf', params.uf.toUpperCase());
                }
                if (params.localidade) {
                    queryParams.append('localidade', params.localidade);
                }
                if (params.tipo) {
                    queryParams.append('tipo', params.tipo);
                }
                if (params.page !== undefined) {
                    queryParams.append('page', params.page.toString());
                }
                if (params.size !== undefined) {
                    queryParams.append('size', params.size.toString());
                }
                const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
                const response = yield this.apiClient.get(`${correios_1.CORREIOS_CONFIG.endpoints.cep.listaLocalidades}${queryString}`);
                return response.data;
            }
            catch (error) {
                console.error('❌ Erro ao listar localidades:', error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                }
                return null;
            }
        });
    }
    /**
     * Lista localidades de uma UF específica
     */
    listarLocalidadesPorUF(uf_1) {
        return __awaiter(this, arguments, void 0, function* (uf, params = {}) {
            try {
                // Converter para maiúsculas
                const ufUpperCase = uf.toUpperCase();
                // Validar UF
                const ufsValidas = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
                    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO'];
                if (!ufsValidas.includes(ufUpperCase)) {
                    throw new Error(`UF inválida: ${uf}. Deve ser uma UF brasileira válida.`);
                }
                console.log(`🔍 Listando localidades da UF: ${ufUpperCase}`);
                // Construir query string com os parâmetros
                const queryParams = new URLSearchParams();
                if (params.tipo) {
                    queryParams.append('tipo', params.tipo);
                }
                if (params.localidade) {
                    queryParams.append('localidade', params.localidade);
                }
                if (params.page !== undefined) {
                    queryParams.append('page', params.page.toString());
                }
                if (params.size !== undefined) {
                    queryParams.append('size', params.size.toString());
                }
                const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
                const response = yield this.apiClient.get(`${correios_1.CORREIOS_CONFIG.endpoints.cep.listaLocalidadesUf}${ufUpperCase}${queryString}`);
                return response.data;
            }
            catch (error) {
                console.error(`❌ Erro ao listar localidades da UF ${uf}:`, error.message);
                if (error.response) {
                    console.error('❌ Status da resposta:', error.response.status);
                    console.error('❌ Dados da resposta:', JSON.stringify(error.response.data || {}));
                }
                return null;
            }
        });
    }
    /**
     * Cria prepostagem para um pedido do sistema
     */
    criarPrepostagemPedido(dadosPedido) {
        return __awaiter(this, void 0, void 0, function* () {
            const prepostagemData = {
                remetente: {
                    nome: correios_1.CORREIOS_CONFIG.remetente.nome,
                    cnpj: correios_1.CORREIOS_CONFIG.remetente.cnpj,
                    inscricaoEstadual: correios_1.CORREIOS_CONFIG.remetente.inscricaoEstadual,
                    endereco: {
                        logradouro: correios_1.CORREIOS_CONFIG.remetente.endereco.logradouro,
                        numero: correios_1.CORREIOS_CONFIG.remetente.endereco.numero,
                        complemento: correios_1.CORREIOS_CONFIG.remetente.endereco.complemento,
                        bairro: correios_1.CORREIOS_CONFIG.remetente.endereco.bairro,
                        cidade: correios_1.CORREIOS_CONFIG.remetente.endereco.cidade,
                        uf: correios_1.CORREIOS_CONFIG.remetente.endereco.uf,
                        cep: correios_1.CORREIOS_CONFIG.remetente.endereco.cep
                    },
                    telefone: correios_1.CORREIOS_CONFIG.remetente.telefone,
                    email: correios_1.CORREIOS_CONFIG.remetente.email
                },
                destinatario: dadosPedido.destinatario,
                servico: dadosPedido.servico,
                volumes: [{
                        altura: 5, // altura padrão em cm para kimono
                        largura: 25, // largura padrão em cm
                        comprimento: 30, // comprimento padrão em cm
                        peso: Math.max(dadosPedido.peso, 300), // peso mínimo 300g
                        tipoObjeto: 2, // 2 = Pacote
                        valorDeclarado: dadosPedido.valor && dadosPedido.valor > 50 ? dadosPedido.valor : undefined
                    }],
                servicosAdicionais: dadosPedido.valor && dadosPedido.valor > 50 ? ['001'] : undefined, // 001 = Valor declarado
                observacao: dadosPedido.observacao || `Pedido #${dadosPedido.orderId}`
            };
            return yield this.criarPrepostagem(prepostagemData);
        });
    }
    /**
     * Valida se as configurações dos Correios estão corretas
     */
    validateConfig() {
        const required = [
            this.config.idCorreios,
            this.config.codigoAcesso,
            this.config.contrato,
            this.config.cartaoPostagem,
            correios_1.CORREIOS_CONFIG.remetente.nome,
            correios_1.CORREIOS_CONFIG.remetente.cnpj,
            correios_1.CORREIOS_CONFIG.remetente.endereco.cep
        ];
        return required.every(field => field && field.trim() !== '');
    }
    /**
     * Testa a conexão com a API dos Correios
     */
    testarConexao() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔍 Testando conexão com a API dos Correios...');
                console.log(`🔧 Ambiente: ${this.config.ambiente}`);
                console.log(`🔧 ID Correios: ${this.config.idCorreios}`);
                console.log(`🔧 Cartão de Postagem: ${this.config.cartaoPostagem}`);
                // Tentar autenticar
                try {
                    yield this.authenticate();
                    console.log(`✅ Conexão com a API dos Correios estabelecida com sucesso!`);
                    return true;
                }
                catch (authError) {
                    console.error('❌ Erro na autenticação:', authError);
                    return false;
                }
            }
            catch (error) {
                console.error('❌ Erro ao testar conexão:', error.message);
                return false;
            }
        });
    }
    /**
     * Retorna informações sobre o status do token
     */
    getTokenStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verificar se temos um token
                if (!this.token || !this.tokenExpiration) {
                    return {
                        valido: false,
                        ultimaAtualizacao: null,
                        expiraEm: null,
                        tempoRestante: null
                    };
                }
                // Verificar se o token ainda é válido
                const now = new Date();
                const expiraEm = new Date(this.tokenExpiration);
                const tempoRestanteMs = expiraEm.getTime() - now.getTime();
                const tempoRestanteMin = Math.floor(tempoRestanteMs / (1000 * 60));
                return {
                    valido: tempoRestanteMs > 0,
                    ultimaAtualizacao: this.tokenExpiration ? new Date(this.tokenExpiration.getTime() - (30 * 60 * 1000)).toISOString() : null,
                    expiraEm: this.tokenExpiration ? this.tokenExpiration.toISOString() : null,
                    tempoRestante: tempoRestanteMin
                };
            }
            catch (error) {
                console.error('❌ Erro ao verificar status do token:', error);
                return {
                    valido: false,
                    ultimaAtualizacao: null,
                    expiraEm: null,
                    tempoRestante: null
                };
            }
        });
    }
}
exports.CorreiosService = CorreiosService;
// Instância singleton
exports.correiosService = new CorreiosService();
exports.default = CorreiosService;
