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
exports.logSyncOperations = exports.applySyncMiddleware = exports.syncStockFromBling = exports.syncOrderToBling = exports.syncProductToBling = void 0;
const bling_service_1 = __importDefault(require("../services/bling.service"));
// Middleware para sincronização automática de produtos
const syncProductToBling = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Só executar se a sincronização estiver habilitada
        const config = bling_service_1.default.getSyncConfig();
        if (!config.syncProducts) {
            return next();
        }
        // Pegar dados do produto da resposta (assumindo que foi criado/atualizado)
        const originalSend = res.send;
        res.send = function (data) {
            // Chamar o método original primeiro
            const result = originalSend.call(this, data);
            // Tentar sincronizar em background (não bloquear resposta)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    try {
                        let productData;
                        // Tentar parsear os dados da resposta
                        if (typeof data === 'string') {
                            try {
                                const parsedData = JSON.parse(data);
                                productData = parsedData.product || parsedData;
                            }
                            catch (_c) {
                                console.log('Não foi possível parsear dados do produto para sincronização');
                                return;
                            }
                        }
                        else {
                            productData = data.product || data;
                        }
                        // Sincronizar se tiver dados válidos
                        if (productData && productData.id) {
                            console.log(`🔄 Iniciando sincronização automática do produto ${productData.id}`);
                            yield bling_service_1.default.syncProductToBling({
                                id: productData.id,
                                name: productData.name,
                                code: (_a = productData.id) === null || _a === void 0 ? void 0 : _a.toString(),
                                price: productData.price,
                                active: true,
                                description: productData.description,
                                minStock: 0,
                                imageUrl: productData.imageUrl,
                                category: (_b = productData.category) === null || _b === void 0 ? void 0 : _b.name
                            });
                            console.log(`✅ Produto ${productData.id} sincronizado com Bling`);
                        }
                    }
                    catch (error) {
                        console.error('❌ Erro na sincronização automática do produto:', error);
                    }
                }));
            }
            return result;
        };
        next();
    }
    catch (error) {
        console.error('Erro no middleware de sincronização de produto:', error);
        next(); // Continuar mesmo com erro para não quebrar o fluxo
    }
});
exports.syncProductToBling = syncProductToBling;
// Middleware para sincronização automática de pedidos
const syncOrderToBling = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Só executar se a sincronização estiver habilitada
        const config = bling_service_1.default.getSyncConfig();
        if (!config.syncOrders) {
            return next();
        }
        // Pegar dados do pedido da resposta
        const originalSend = res.send;
        res.send = function (data) {
            // Chamar o método original primeiro
            const result = originalSend.call(this, data);
            // Tentar sincronizar em background (não bloquear resposta)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        let orderData;
                        // Tentar parsear os dados da resposta
                        if (typeof data === 'string') {
                            try {
                                const parsedData = JSON.parse(data);
                                orderData = parsedData.order || parsedData;
                            }
                            catch (_a) {
                                console.log('Não foi possível parsear dados do pedido para sincronização');
                                return;
                            }
                        }
                        else {
                            orderData = data.order || data;
                        }
                        // Sincronizar se tiver dados válidos e status apropriado
                        if (orderData && orderData.id && orderData.status === 'PAID') {
                            console.log(`🔄 Iniciando sincronização automática do pedido ${orderData.id}`);
                            yield bling_service_1.default.syncOrderToBling({
                                id: orderData.id,
                                total: orderData.total,
                                customerName: orderData.customerName,
                                customerEmail: orderData.customerEmail,
                                customerPhone: orderData.customerPhone,
                                customerDocument: '',
                                shippingAddress: orderData.shippingAddress ? {
                                    street: orderData.shippingAddress,
                                    number: '',
                                    neighborhood: '',
                                    zipCode: '',
                                    city: '',
                                    state: ''
                                } : undefined,
                                items: orderData.items || [],
                                notes: ''
                            });
                            console.log(`✅ Pedido ${orderData.id} sincronizado com Bling`);
                        }
                    }
                    catch (error) {
                        console.error('❌ Erro na sincronização automática do pedido:', error);
                    }
                }));
            }
            return result;
        };
        next();
    }
    catch (error) {
        console.error('Erro no middleware de sincronização de pedido:', error);
        next(); // Continuar mesmo com erro para não quebrar o fluxo
    }
});
exports.syncOrderToBling = syncOrderToBling;
// Middleware para sincronização automática de estoque (quando atualizado via webhook)
const syncStockFromBling = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = bling_service_1.default.getSyncConfig();
        if (!config.autoUpdateStock) {
            return next();
        }
        // Este middleware pode ser usado em webhooks ou outras atualizações de estoque
        console.log('🔄 Middleware de sincronização de estoque ativo');
        next();
    }
    catch (error) {
        console.error('Erro no middleware de sincronização de estoque:', error);
        next();
    }
});
exports.syncStockFromBling = syncStockFromBling;
// Helper para aplicar sync condicional baseado no método HTTP
const applySyncMiddleware = (entity) => {
    return (req, res, next) => {
        // Aplicar sincronização apenas em operações de criação/atualização
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            if (entity === 'product') {
                return (0, exports.syncProductToBling)(req, res, next);
            }
            else if (entity === 'order') {
                return (0, exports.syncOrderToBling)(req, res, next);
            }
        }
        next();
    };
};
exports.applySyncMiddleware = applySyncMiddleware;
// Middleware para log de operações de sincronização
const logSyncOperations = (req, res, next) => {
    if (req.path.includes('/api/bling/')) {
        console.log(`🔗 Operação Bling: ${req.method} ${req.path}`);
        const startTime = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            console.log(`🔗 Bling: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
    }
    next();
};
exports.logSyncOperations = logSyncOperations;
