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
     * Rastreia múltiplos objetos pelos Correios
     */
    rastrearMultiplosObjetos(codigosRastreio) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔍 Rastreando ${codigosRastreio.length} objetos...`);
                const requests = codigosRastreio.map((codigo) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const result = yield this.rastrearObjeto(codigo);
                        return { codigo, result };
                    }
                    catch (error) {
                        console.error(`❌ Erro ao rastrear código ${codigo}:`, error);
                        return { codigo, result: null };
                    }
                }));
                const results = yield Promise.all(requests);
                const tracking = {};
                results.forEach(({ codigo, result }) => {
                    tracking[codigo] = result;
                });
                return tracking;
            }
            catch (error) {
                console.error('❌ Erro ao rastrear múltiplos objetos:', error.message);
                // Retornar objeto vazio em caso de erro geral
                const tracking = {};
                codigosRastreio.forEach(codigo => {
                    tracking[codigo] = null;
                });
                return tracking;
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
            var _a, _b;
            console.log(`🚀 === INÍCIO DA PREPOSTAGEM - PEDIDO ${dadosPedido.orderId} ===`);
            // Funções de limpeza e validação
            const limparTelefone = (telefone) => {
                if (!telefone)
                    return '';
                const cleaned = telefone.replace(/\D/g, '');
                // Telefone máximo 12 dígitos (com DDD)
                return cleaned.length > 12 ? cleaned.slice(0, 12) : cleaned;
            };
            const limparCEP = (cep) => {
                if (!cep)
                    return '';
                const cleaned = cep.replace(/\D/g, '');
                return cleaned.length === 8 ? cleaned : '';
            };
            const limparDocumento = (documento) => {
                if (!documento)
                    return '';
                return documento.replace(/\D/g, '');
            };
            // Garantir autenticação válida
            yield this.authenticate();
            // Converter peso para gramas (mínimo 300g conforme regras dos Correios)
            const pesoGramas = Math.max(Math.round(dadosPedido.peso * 1000), 300);
            console.log(`📋 Dados de entrada:`);
            console.log(`- Pedido ID: ${dadosPedido.orderId}`);
            console.log(`- Peso: ${dadosPedido.peso}kg → ${pesoGramas}g`);
            console.log(`- Serviço: ${dadosPedido.servico}`);
            console.log(`- Destinatário: ${dadosPedido.destinatario.nome}`);
            console.log(`- Doc. destinatário: ${dadosPedido.destinatario.documento}`);
            console.log(`- Tel. destinatário: ${dadosPedido.destinatario.telefone}`);
            console.log(`- CEP origem → destino: ${correios_1.CORREIOS_CONFIG.remetente.endereco.cep} → ${dadosPedido.destinatario.endereco.cep}`);
            // Validações críticas
            const validationErrors = [];
            // Carregar dados do remetente diretamente das variáveis de ambiente
            const remetenteData = {
                nome: process.env.CORREIOS_REMETENTE_NOME || 'KIMONO STORE',
                cnpj: process.env.CORREIOS_REMETENTE_CNPJ || '',
                telefone: process.env.CORREIOS_REMETENTE_TELEFONE || '',
                endereco: {
                    logradouro: process.env.CORREIOS_REMETENTE_LOGRADOURO || '',
                    numero: process.env.CORREIOS_REMETENTE_NUMERO || '',
                    complemento: process.env.CORREIOS_REMETENTE_COMPLEMENTO || '',
                    bairro: process.env.CORREIOS_REMETENTE_BAIRRO || '',
                    cidade: process.env.CORREIOS_REMETENTE_CIDADE || '',
                    uf: process.env.CORREIOS_REMETENTE_UF || '',
                    cep: process.env.CORREIOS_REMETENTE_CEP || ''
                }
            };
            console.log('🔧 Dados do remetente carregados:');
            console.log('- Nome:', remetenteData.nome);
            console.log('- CNPJ:', remetenteData.cnpj);
            console.log('- Telefone:', remetenteData.telefone);
            console.log('- Logradouro:', remetenteData.endereco.logradouro);
            console.log('- Número:', remetenteData.endereco.numero);
            console.log('- Bairro:', remetenteData.endereco.bairro);
            console.log('- Cidade:', remetenteData.endereco.cidade);
            console.log('- UF:', remetenteData.endereco.uf);
            console.log('- CEP:', remetenteData.endereco.cep);
            if (!remetenteData.cnpj) {
                validationErrors.push('CNPJ do remetente não configurado');
            }
            if (!remetenteData.telefone) {
                validationErrors.push('Telefone do remetente não configurado');
            }
            if (!remetenteData.endereco.logradouro) {
                validationErrors.push('Logradouro do remetente não configurado');
            }
            if (!remetenteData.endereco.numero) {
                validationErrors.push('Número do endereço do remetente não configurado');
            }
            if (!remetenteData.endereco.bairro) {
                validationErrors.push('Bairro do remetente não configurado');
            }
            if (!remetenteData.endereco.cidade) {
                validationErrors.push('Cidade do remetente não configurada');
            }
            if (!remetenteData.endereco.uf) {
                validationErrors.push('UF do remetente não configurada');
            }
            if (!remetenteData.endereco.cep) {
                validationErrors.push('CEP do remetente não configurado');
            }
            if (!dadosPedido.destinatario.nome || dadosPedido.destinatario.nome.trim().length < 3) {
                validationErrors.push('Nome do destinatário deve ter pelo menos 3 caracteres');
            }
            if (!dadosPedido.destinatario.endereco.logradouro || dadosPedido.destinatario.endereco.logradouro.trim().length < 3) {
                validationErrors.push('Logradouro do destinatário deve ter pelo menos 3 caracteres');
            }
            if (!dadosPedido.destinatario.endereco.numero) {
                validationErrors.push('Número do endereço do destinatário é obrigatório');
            }
            if (!dadosPedido.destinatario.endereco.bairro || dadosPedido.destinatario.endereco.bairro.trim().length < 2) {
                validationErrors.push('Bairro do destinatário deve ter pelo menos 2 caracteres');
            }
            if (!dadosPedido.destinatario.endereco.cidade || dadosPedido.destinatario.endereco.cidade.trim().length < 2) {
                validationErrors.push('Cidade do destinatário deve ter pelo menos 2 caracteres');
            }
            if (!dadosPedido.destinatario.endereco.uf || dadosPedido.destinatario.endereco.uf.length !== 2) {
                validationErrors.push('UF do destinatário deve ter exatamente 2 caracteres');
            }
            if (!dadosPedido.destinatario.documento || dadosPedido.destinatario.documento.replace(/\D/g, '').length < 11) {
                validationErrors.push('Documento do destinatário deve ter pelo menos 11 dígitos (CPF)');
            }
            const cepDestinoLimpo = limparCEP(dadosPedido.destinatario.endereco.cep);
            if (!cepDestinoLimpo || cepDestinoLimpo.length !== 8) {
                validationErrors.push(`CEP do destinatário inválido: ${dadosPedido.destinatario.endereco.cep}`);
            }
            const cepOrigemLimpo = limparCEP(remetenteData.endereco.cep);
            if (!cepOrigemLimpo || cepOrigemLimpo.length !== 8) {
                validationErrors.push(`CEP do remetente inválido: ${remetenteData.endereco.cep}`);
            }
            if (validationErrors.length > 0) {
                console.error('❌ Erros de validação encontrados:');
                validationErrors.forEach(error => console.error(`   - ${error}`));
                throw new Error(`Validação falhou: ${validationErrors.join('; ')}`);
            }
            // ✅ VALIDAÇÕES E FORMATAÇÕES ESPECÍFICAS DA API DOS CORREIOS
            // 1. Validar e formatar telefone do remetente (deve ter exatamente 10 ou 11 dígitos)
            const telefoneRemetenteLimpo = remetenteData.telefone.replace(/\D/g, '');
            if (telefoneRemetenteLimpo.length < 10 || telefoneRemetenteLimpo.length > 11) {
                throw new Error(`Telefone do remetente inválido: "${remetenteData.telefone}". Deve ter 10 ou 11 dígitos.`);
            }
            // 2. Validar e formatar CNPJ do remetente (deve ter exatamente 14 dígitos)
            const cnpjRemetenteLimpo = remetenteData.cnpj.replace(/\D/g, '');
            if (cnpjRemetenteLimpo.length !== 14) {
                throw new Error(`CNPJ do remetente inválido: "${remetenteData.cnpj}". Deve ter exatamente 14 dígitos.`);
            }
            // 3. Validar e formatar telefone do destinatário
            const telefoneDestinatarioLimpo = ((_a = dadosPedido.destinatario.telefone) === null || _a === void 0 ? void 0 : _a.replace(/\D/g, '')) || '';
            // 4. Validar e formatar documento do destinatário
            const documentoDestinatarioLimpo = dadosPedido.destinatario.documento.replace(/\D/g, '');
            if (documentoDestinatarioLimpo.length !== 11 && documentoDestinatarioLimpo.length !== 14) {
                throw new Error(`Documento do destinatário inválido: "${dadosPedido.destinatario.documento}". Deve ser CPF (11 dígitos) ou CNPJ (14 dígitos).`);
            }
            console.log('🔧 Dados processados e validados:');
            console.log('- CNPJ remetente:', cnpjRemetenteLimpo);
            console.log('- Tel. remetente:', telefoneRemetenteLimpo);
            console.log('- Doc. destinatário:', documentoDestinatarioLimpo);
            console.log('- Tel. destinatário:', telefoneDestinatarioLimpo);
            console.log('- CEP origem:', remetenteData.endereco.cep.replace(/\D/g, ''));
            console.log('- CEP destino:', dadosPedido.destinatario.endereco.cep.replace(/\D/g, ''));
            // ✅ PAYLOAD CORRIGIDO BASEADO NA DOCUMENTAÇÃO OFICIAL RequestPrePostagemExternaDTO
            const payload = {
                // ✅ CAMPOS OBRIGATÓRIOS BÁSICOS
                codigoServico: dadosPedido.servico,
                pesoInformado: Math.round(dadosPedido.peso * 1000).toString(), // ✅ String conforme documentação
                codigoFormatoObjetoInformado: "2", // ✅ "2" = Caixa/Pacote (conforme documentação)
                // ✅ DIMENSÕES OBRIGATÓRIAS PARA FORMATO CAIXA/PACOTE (em cm, como string)
                alturaInformada: "10",
                larguraInformada: "25",
                comprimentoInformado: "35",
                // ✅ CAMPO OBRIGATÓRIO: Objetos não proibidos
                cienteObjetoNaoProibido: "1", // ✅ "1" = objeto permitido (conforme documentação)
                // ✅ REMETENTE COMPLETO (conforme schema RemetenteDTO)
                remetente: {
                    nome: remetenteData.nome,
                    cpfCnpj: cnpjRemetenteLimpo, // ✅ Campo correto: cpfCnpj (não cnpj)
                    endereco: {
                        cep: remetenteData.endereco.cep.replace(/\D/g, ''),
                        logradouro: remetenteData.endereco.logradouro,
                        numero: remetenteData.endereco.numero,
                        complemento: remetenteData.endereco.complemento || "",
                        bairro: remetenteData.endereco.bairro,
                        cidade: remetenteData.endereco.cidade,
                        uf: remetenteData.endereco.uf
                    },
                    // ✅ TELEFONE FORMATADO CORRETAMENTE: DDD + número separados
                    dddTelefone: telefoneRemetenteLimpo.substring(0, 2), // ✅ DDD separado
                    telefone: telefoneRemetenteLimpo.length === 10 ? telefoneRemetenteLimpo.substring(2) : undefined, // ✅ Número fixo (8 dígitos)
                    dddCelular: telefoneRemetenteLimpo.length === 11 ? telefoneRemetenteLimpo.substring(0, 2) : undefined, // ✅ DDD celular
                    celular: telefoneRemetenteLimpo.length === 11 ? telefoneRemetenteLimpo.substring(2) : undefined, // ✅ Número celular (9 dígitos)
                    email: process.env.CORREIOS_REMETENTE_EMAIL || "MARCELO.PROCOPIO@EGASOLUTIONS.COM.BR"
                },
                // ✅ DESTINATÁRIO COMPLETO (conforme schema DestinatarioDTO)
                destinatario: Object.assign(Object.assign(Object.assign({ nome: dadosPedido.destinatario.nome, cpfCnpj: documentoDestinatarioLimpo, endereco: {
                        cep: dadosPedido.destinatario.endereco.cep.replace(/\D/g, ''),
                        logradouro: dadosPedido.destinatario.endereco.logradouro,
                        numero: dadosPedido.destinatario.endereco.numero,
                        complemento: dadosPedido.destinatario.endereco.complemento || "",
                        bairro: dadosPedido.destinatario.endereco.bairro,
                        cidade: dadosPedido.destinatario.endereco.cidade,
                        uf: dadosPedido.destinatario.endereco.uf
                    } }, (telefoneDestinatarioLimpo.length === 10 && {
                    dddTelefone: telefoneDestinatarioLimpo.substring(0, 2),
                    telefone: telefoneDestinatarioLimpo.substring(2)
                })), (telefoneDestinatarioLimpo.length === 11 && {
                    dddCelular: telefoneDestinatarioLimpo.substring(0, 2),
                    celular: telefoneDestinatarioLimpo.substring(2)
                })), { email: dadosPedido.destinatario.email || "" }),
                // ✅ DECLARAÇÃO DE CONTEÚDO (conforme schema ItemDeclaracaoConteudo)
                itensDeclaracaoConteudo: [
                    {
                        conteudo: "Produtos Kimono Store", // ✅ Nome correto do campo
                        quantidade: "1", // ✅ String conforme documentação
                        valor: Number(dadosPedido.valor || 0).toFixed(2) // ✅ String com 2 decimais
                    }
                ],
                // ✅ OBSERVAÇÃO (opcional, max 50 caracteres)
                observacao: `Pedido #${dadosPedido.orderId}`.substring(0, 50)
            };
            console.log('📦 Payload FINAL validado e corrigido:');
            console.log(`- Serviço: ${payload.codigoServico}`);
            console.log(`- Peso: ${payload.pesoInformado}g`);
            console.log(`- Formato: Pacote (${payload.codigoFormatoObjetoInformado})`);
            console.log(`- Dimensões: ${payload.alturaInformada}x${payload.larguraInformada}x${payload.comprimentoInformado}cm`);
            console.log(`- CNPJ Remetente: ${payload.remetente.cpfCnpj} (${payload.remetente.cpfCnpj.length} dígitos)`);
            console.log(`- Tel. Remetente: ${payload.remetente.dddTelefone}${payload.remetente.telefone} (${((_b = payload.remetente.telefone) === null || _b === void 0 ? void 0 : _b.length) || 0} dígitos)`);
            console.log(`- Cel. Remetente: ${payload.remetente.dddCelular || ''}${payload.remetente.celular || ''} (${(payload.remetente.celular || '').length} dígitos)`);
            console.log(`- Doc. Destinatário: ${payload.destinatario.cpfCnpj} (${payload.destinatario.cpfCnpj.length} dígitos)`);
            console.log(`- Tel. Destinatário: ${payload.destinatario.dddTelefone || ''}${payload.destinatario.telefone || ''} (${(payload.destinatario.telefone || '').length} dígitos)`);
            console.log(`- Cel. Destinatário: ${payload.destinatario.dddCelular || ''}${payload.destinatario.celular || ''} (${(payload.destinatario.celular || '').length} dígitos)`);
            console.log(`- Objetos proibidos: ${payload.cienteObjetoNaoProibido}`);
            console.log(`- Declaração valor: R$ ${payload.itensDeclaracaoConteudo[0].valor}`);
            // ✅ VALIDAÇÕES FINAIS CRÍTICAS
            console.log('🔍 VALIDAÇÃO FINAL DO PAYLOAD:');
            // Validar telefone/celular do remetente
            const telefoneRemetente = payload.remetente.telefone ? `${payload.remetente.dddTelefone}${payload.remetente.telefone}` : '';
            const celularRemetente = payload.remetente.celular ? `${payload.remetente.dddCelular}${payload.remetente.celular}` : '';
            if (!telefoneRemetente && !celularRemetente) {
                throw new Error(`Telefone ou celular do remetente é obrigatório.`);
            }
            if (telefoneRemetente && telefoneRemetente.length !== 10) {
                throw new Error(`Telefone do remetente inválido: "${telefoneRemetente}". Deve ter exatamente 10 dígitos.`);
            }
            if (celularRemetente && celularRemetente.length !== 11) {
                throw new Error(`Celular do remetente inválido: "${celularRemetente}". Deve ter exatamente 11 dígitos.`);
            }
            // Validar CNPJ do remetente
            if (!payload.remetente.cpfCnpj || payload.remetente.cpfCnpj.length !== 14) {
                throw new Error(`CNPJ do remetente inválido: "${payload.remetente.cpfCnpj}". Deve ter 14 dígitos.`);
            }
            // Validar formato do objeto
            if (!payload.codigoFormatoObjetoInformado || payload.codigoFormatoObjetoInformado !== "2") {
                throw new Error(`Formato do objeto inválido: "${payload.codigoFormatoObjetoInformado}". Deve ser "2".`);
            }
            // Validar objetos proibidos
            if (!payload.cienteObjetoNaoProibido || payload.cienteObjetoNaoProibido !== "1") {
                throw new Error(`Campo cienteObjetoNaoProibido inválido: "${payload.cienteObjetoNaoProibido}". Deve ser "1".`);
            }
            // Validar declaração de conteúdo
            if (!payload.itensDeclaracaoConteudo || payload.itensDeclaracaoConteudo.length === 0) {
                throw new Error(`Declaração de conteúdo inválida ou vazia.`);
            }
            // Validar peso
            const pesoNumerico = parseInt(payload.pesoInformado);
            if (!payload.pesoInformado || pesoNumerico <= 0) {
                throw new Error(`Peso inválido: ${payload.pesoInformado}g. Deve ser maior que 0.`);
            }
            console.log('✅ Todas as validações passaram. Enviando para a API...');
            console.log('🔍 Payload com estrutura nested validado:', JSON.stringify(payload, null, 2));
            // Chamar API dos Correios
            try {
                console.log(`🌐 Enviando requisição para: ${this.apiClient.defaults.baseURL}${correios_1.CORREIOS_CONFIG.endpoints.prepostagem.criar}`);
                console.log(`🔑 Token: ${this.token ? 'Presente' : 'AUSENTE'}`);
                const response = yield this.apiClient.post(correios_1.CORREIOS_CONFIG.endpoints.prepostagem.criar, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    timeout: 60000 // 60 segundos
                });
                console.log(`✅ Resposta recebida - Status: ${response.status}`);
                console.log(`✅ Dados da resposta:`, JSON.stringify(response.data, null, 2));
                const resultado = response.data;
                if (resultado && (resultado.codigoObjeto || resultado.id)) {
                    const codigoRastreio = resultado.codigoObjeto || resultado.id;
                    console.log(`🎉 Prepostagem criada com SUCESSO! Código: ${codigoRastreio}`);
                    return Object.assign(Object.assign({}, resultado), { codigoObjeto: codigoRastreio });
                }
                else {
                    console.error(`❌ Resposta sem código de rastreio:`, JSON.stringify(resultado));
                    return {
                        id: '',
                        codigoObjeto: '',
                        valorPostagem: 0,
                        prazoEntrega: 0,
                        dataPrevisaoPostagem: '',
                        erro: 'CODIGO_AUSENTE',
                        mensagem: 'API dos Correios não retornou código de rastreio'
                    };
                }
            }
            catch (error) {
                console.error(`💥 === ERRO NA PREPOSTAGEM - PEDIDO ${dadosPedido.orderId} ===`);
                console.error(`❌ Mensagem: ${error.message}`);
                if (error.response) {
                    console.error(`❌ Status HTTP: ${error.response.status}`);
                    console.error(`❌ Headers:`, JSON.stringify(error.response.headers || {}, null, 2));
                    console.error(`❌ Dados do erro:`, JSON.stringify(error.response.data || {}, null, 2));
                    // Análise detalhada dos erros
                    const errorData = error.response.data;
                    let mensagemErro = 'Erro desconhecido na API dos Correios';
                    if (errorData) {
                        if (typeof errorData === 'string') {
                            mensagemErro = errorData;
                        }
                        else if (errorData.mensagem) {
                            mensagemErro = errorData.mensagem;
                        }
                        else if (errorData.message) {
                            mensagemErro = errorData.message;
                        }
                        else if (errorData.erro) {
                            mensagemErro = errorData.erro;
                        }
                        else if (errorData.errors && Array.isArray(errorData.errors)) {
                            mensagemErro = errorData.errors.map((e) => e.message || e.mensagem || e).join('; ');
                        }
                    }
                    // Códigos de erro específicos
                    if (error.response.status === 400) {
                        console.error(`❌ ERRO 400: Dados inválidos enviados para os Correios`);
                        console.error(`💡 Verifique: telefones, documentos, CEPs, peso, dimensões`);
                    }
                    else if (error.response.status === 401) {
                        console.error(`❌ ERRO 401: Token inválido ou expirado`);
                        console.error(`💡 Tentando renovar token...`);
                        this.token = null;
                        this.tokenExpiration = null;
                    }
                    else if (error.response.status === 403) {
                        console.error(`❌ ERRO 403: Sem permissão para usar esta API`);
                        console.error(`💡 Verifique se seu contrato tem acesso à API de prepostagem`);
                    }
                    else if (error.response.status === 422) {
                        console.error(`❌ ERRO 422: Dados de negócio inválidos`);
                        console.error(`💡 Verifique regras específicas dos Correios`);
                    }
                    return {
                        id: '',
                        codigoObjeto: '',
                        valorPostagem: 0,
                        prazoEntrega: 0,
                        dataPrevisaoPostagem: '',
                        erro: `HTTP_${error.response.status}`,
                        mensagem: mensagemErro
                    };
                }
                else {
                    console.error(`❌ Erro de rede ou timeout:`, error.message);
                    return {
                        id: '',
                        codigoObjeto: '',
                        valorPostagem: 0,
                        prazoEntrega: 0,
                        dataPrevisaoPostagem: '',
                        erro: 'ERRO_REDE',
                        mensagem: `Erro de comunicação: ${error.message}`
                    };
                }
            }
            finally {
                console.log(`🏁 === FIM DA PREPOSTAGEM - PEDIDO ${dadosPedido.orderId} ===`);
            }
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
