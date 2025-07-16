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
exports.rastrearObjeto = exports.statusPublico = exports.verificarStatusIntegracao = exports.testarConexao = exports.processarPedidosPagos = exports.gerarCodigoRastreio = void 0;
const order_service_1 = require("../services/order.service");
const correios_service_1 = require("../services/correios.service");
/**
 * Gerar código de rastreio para um pedido
 */
const gerarCodigoRastreio = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        if (!orderId || isNaN(Number(orderId))) {
            return res.status(400).json({
                error: 'ID do pedido inválido'
            });
        }
        const codigoRastreio = yield order_service_1.orderService.gerarCodigoRastreio(Number(orderId));
        if (!codigoRastreio) {
            return res.status(400).json({
                error: 'Não foi possível gerar código de rastreio. Verifique se o pedido está pago e se a configuração dos Correios está correta.'
            });
        }
        return res.json({
            success: true,
            orderId: Number(orderId),
            trackingNumber: codigoRastreio,
            message: 'Código de rastreio gerado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao gerar código de rastreio:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});
exports.gerarCodigoRastreio = gerarCodigoRastreio;
/**
 * Processar todos os pedidos pagos sem código de rastreio
 */
const processarPedidosPagos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield order_service_1.orderService.processarPedidosPagos();
        return res.json({
            success: true,
            message: 'Processamento de pedidos pagos iniciado com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao processar pedidos pagos:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor'
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
            error: 'Erro interno do servidor'
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
        return res.json({
            success: true,
            status: {
                configValida,
                conexaoOk,
                tokenValido,
                ultimaAtualizacaoToken,
                pedidosPendentes,
                ambiente: process.env.CORREIOS_AMBIENTE || 'HOMOLOGACAO'
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
 * Rastrear objeto pelos Correios
 */
const rastrearObjeto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { codigoRastreio } = req.params;
        if (!codigoRastreio || codigoRastreio.length < 13) {
            return res.status(400).json({
                error: 'Código de rastreio inválido'
            });
        }
        const rastreamento = yield correios_service_1.correiosService.rastrearObjeto(codigoRastreio);
        if (!rastreamento) {
            return res.status(404).json({
                error: 'Código de rastreio não encontrado ou inválido'
            });
        }
        return res.json({
            success: true,
            codigoRastreio,
            rastreamento
        });
    }
    catch (error) {
        console.error('Erro ao rastrear objeto:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});
exports.rastrearObjeto = rastrearObjeto;
