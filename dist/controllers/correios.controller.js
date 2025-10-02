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
Object.defineProperty(exports, "__esModule", { value: true });
exports.obterHistoricoJob = exports.rastrearObjeto = exports.statusPublico = exports.verificarStatusIntegracao = exports.testarConexao = exports.processarPedidosPagos = exports.gerarCodigoRastreio = void 0;
const order_service_1 = require("../services/order.service");
const correios_service_1 = require("../services/correios.service");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Chave para armazenar o histórico de jobs no AppSettings
const JOB_HISTORY_KEY = 'correios_job_history';
const JOB_LAST_RUN_KEY = 'correios_job_last_run';
/**
 * Gerar código de rastreio para um pedido específico
 */
const gerarCodigoRastreio = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        if (!orderId || isNaN(Number(orderId))) {
            return res.status(400).json({
                error: 'ID do pedido inválido'
            });
        }
        const result = yield order_service_1.orderService.gerarCodigoRastreio(Number(orderId));
        return res.json({
            success: true,
            trackingNumber: result.trackingNumber,
            message: 'Código de rastreio gerado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao gerar código de rastreio:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});
exports.gerarCodigoRastreio = gerarCodigoRastreio;
/**
 * Processar todos os pedidos pagos sem código de rastreio
 */
const processarPedidosPagos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Registrar início da execução
        const startTime = new Date();
        const executionId = `job-${Date.now()}`;
        // Criar registro de execução em andamento
        const runningExecution = {
            id: executionId,
            timestamp: startTime.toISOString(),
            status: 'running',
            pedidosProcessados: 0
        };
        // Salvar registro de execução em andamento
        yield saveJobExecution(runningExecution);
        // Executar processamento de pedidos
        const result = yield order_service_1.orderService.processarPedidosPagos();
        // Calcular duração
        const endTime = new Date();
        const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
        // Atualizar registro com sucesso
        const successExecution = Object.assign(Object.assign({}, runningExecution), { status: 'success', pedidosProcessados: result.processados, duracao: durationSeconds });
        // Salvar registro atualizado
        yield saveJobExecution(successExecution);
        // Atualizar última execução
        yield updateLastJobRun({
            lastRun: startTime.toISOString(),
            nextRun: calculateNextRun(),
            status: 'success',
            pedidosProcessados: result.processados
        });
        return res.json({
            success: true,
            message: 'Processamento de pedidos pagos iniciado com sucesso',
            processados: result.processados,
            executionId
        });
    }
    catch (error) {
        console.error('Erro ao processar pedidos pagos:', error);
        // Se temos um ID de execução em andamento, atualizamos com erro
        try {
            const executionId = `job-${Date.now()}`;
            const errorExecution = {
                id: executionId,
                timestamp: new Date().toISOString(),
                status: 'error',
                pedidosProcessados: 0,
                errorMessage: error.message || 'Erro desconhecido'
            };
            yield saveJobExecution(errorExecution);
            // Atualizar última execução
            yield updateLastJobRun({
                lastRun: new Date().toISOString(),
                nextRun: calculateNextRun(),
                status: 'error',
                errorMessage: error.message || 'Erro desconhecido'
            });
        }
        catch (saveError) {
            console.error('Erro ao salvar registro de erro:', saveError);
        }
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});
exports.processarPedidosPagos = processarPedidosPagos;
/**
 * Testar conexão com API dos Correios
 */
const testarConexao = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isValid = correios_service_1.correiosService.validateConfig();
        if (!isValid) {
            return res.status(400).json({
                success: false,
                error: 'Configuração dos Correios incompleta',
                message: 'Verifique se todas as variáveis de ambiente dos Correios estão configuradas'
            });
        }
        const conexaoOk = yield correios_service_1.correiosService.testarConexao();
        if (!conexaoOk) {
            return res.status(400).json({
                success: false,
                error: 'Falha na conexão com a API dos Correios',
                message: 'Verifique suas credenciais e tente novamente'
            });
        }
        return res.json({
            success: true,
            message: 'Conexão com API dos Correios estabelecida com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao testar conexão com Correios:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});
exports.testarConexao = testarConexao;
/**
 * Verificar status detalhado da integração com os Correios
 */
const verificarStatusIntegracao = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar configuração
        const configValida = correios_service_1.correiosService.validateConfig();
        // Testar conexão apenas se a configuração for válida
        let conexaoOk = false;
        let tokenValido = false;
        let ultimaAtualizacaoToken = null;
        let detalhesErro = null;
        if (configValida) {
            try {
                conexaoOk = yield correios_service_1.correiosService.testarConexao();
                // Obter informações adicionais do serviço
                const statusToken = yield correios_service_1.correiosService.getTokenStatus();
                tokenValido = statusToken.valido;
                ultimaAtualizacaoToken = statusToken.ultimaAtualizacao;
            }
            catch (connError) {
                detalhesErro = connError.message || 'Erro desconhecido na conexão';
            }
        }
        // Verificar pedidos pendentes
        const pedidosPendentes = yield order_service_1.orderService.contarPedidosPagosAguardandoRastreio();
        // Obter última execução do job
        const lastJobRun = yield getLastJobRun();
        return res.json({
            success: true,
            status: {
                configValida,
                conexaoOk,
                tokenValido,
                ultimaAtualizacaoToken,
                pedidosPendentes,
                ambiente: process.env.CORREIOS_AMBIENTE || 'HOMOLOGACAO',
                lastJobRun
            },
            detalhesErro,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Erro ao verificar status da integração:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});
exports.verificarStatusIntegracao = verificarStatusIntegracao;
/**
 * Status público da integração com os Correios (versão limitada)
 */
const statusPublico = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar apenas se a integração está funcionando
        const configValida = correios_service_1.correiosService.validateConfig();
        let servicoOperacional = false;
        if (configValida) {
            try {
                servicoOperacional = yield correios_service_1.correiosService.testarConexao();
            }
            catch (error) {
                servicoOperacional = false;
            }
        }
        return res.json({
            success: true,
            servicoOperacional,
            message: servicoOperacional
                ? 'Serviço de rastreamento operacional'
                : 'Serviço de rastreamento temporariamente indisponível'
        });
    }
    catch (error) {
        console.error('Erro ao verificar status público:', error);
        return res.status(500).json({
            success: false,
            servicoOperacional: false,
            message: 'Erro ao verificar status do serviço'
        });
    }
});
exports.statusPublico = statusPublico;
/**
 * Rastrear um objeto pelos Correios
 */
const rastrearObjeto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { codigoRastreio } = req.params;
        if (!codigoRastreio) {
            return res.status(400).json({
                error: 'Código de rastreio não fornecido'
            });
        }
        const resultado = yield correios_service_1.correiosService.rastrearObjeto(codigoRastreio);
        return res.json({
            success: true,
            codigoRastreio,
            rastreamento: resultado
        });
    }
    catch (error) {
        console.error('Erro ao rastrear objeto:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});
exports.rastrearObjeto = rastrearObjeto;
/**
 * Obter histórico de execuções do job de rastreamento
 */
const obterHistoricoJob = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const historico = yield getJobHistory();
        return res.json({
            success: true,
            historico
        });
    }
    catch (error) {
        console.error('Erro ao obter histórico de jobs:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});
exports.obterHistoricoJob = obterHistoricoJob;
/**
 * Salvar uma execução no histórico de jobs
 */
function saveJobExecution(execution) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Buscar histórico atual
            const setting = yield prisma.appSettings.findUnique({
                where: { key: JOB_HISTORY_KEY }
            });
            let historico = [];
            if (setting === null || setting === void 0 ? void 0 : setting.value) {
                try {
                    historico = JSON.parse(setting.value);
                    if (!Array.isArray(historico)) {
                        historico = [];
                    }
                }
                catch (e) {
                    console.error('Erro ao fazer parse do histórico:', e);
                    historico = [];
                }
            }
            // Verificar se já existe uma execução com esse ID
            const existingIndex = historico.findIndex(item => item.id === execution.id);
            if (existingIndex >= 0) {
                // Atualizar execução existente
                historico[existingIndex] = execution;
            }
            else {
                // Adicionar nova execução
                historico = [execution, ...historico].slice(0, 10); // Manter apenas as 10 últimas
            }
            // Salvar histórico atualizado
            yield prisma.appSettings.upsert({
                where: { key: JOB_HISTORY_KEY },
                update: { value: JSON.stringify(historico) },
                create: {
                    key: JOB_HISTORY_KEY,
                    value: JSON.stringify(historico),
                    category: 'correios',
                    description: 'Histórico de execuções do job de rastreamento'
                }
            });
        }
        catch (error) {
            console.error('Erro ao salvar execução de job:', error);
            throw error;
        }
    });
}
/**
 * Obter histórico de execuções do job
 */
function getJobHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const setting = yield prisma.appSettings.findUnique({
                where: { key: JOB_HISTORY_KEY }
            });
            if (!(setting === null || setting === void 0 ? void 0 : setting.value)) {
                return [];
            }
            try {
                const historico = JSON.parse(setting.value);
                return Array.isArray(historico) ? historico : [];
            }
            catch (e) {
                console.error('Erro ao fazer parse do histórico:', e);
                return [];
            }
        }
        catch (error) {
            console.error('Erro ao obter histórico de jobs:', error);
            return [];
        }
    });
}
/**
 * Atualizar informações da última execução do job
 */
function updateLastJobRun(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.appSettings.upsert({
                where: { key: JOB_LAST_RUN_KEY },
                update: { value: JSON.stringify(data) },
                create: {
                    key: JOB_LAST_RUN_KEY,
                    value: JSON.stringify(data),
                    category: 'correios',
                    description: 'Última execução do job de rastreamento'
                }
            });
        }
        catch (error) {
            console.error('Erro ao atualizar última execução do job:', error);
            throw error;
        }
    });
}
/**
 * Obter informações da última execução do job
 */
function getLastJobRun() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const setting = yield prisma.appSettings.findUnique({
                where: { key: JOB_LAST_RUN_KEY }
            });
            if (!(setting === null || setting === void 0 ? void 0 : setting.value)) {
                return null;
            }
            try {
                return JSON.parse(setting.value);
            }
            catch (e) {
                console.error('Erro ao fazer parse da última execução:', e);
                return null;
            }
        }
        catch (error) {
            console.error('Erro ao obter última execução do job:', error);
            return null;
        }
    });
}
/**
 * Calcular próxima execução programada (30 minutos após a atual)
 */
function calculateNextRun() {
    const nextRun = new Date();
    nextRun.setMinutes(nextRun.getMinutes() + 30);
    return nextRun.toISOString();
}
