"use strict";
/**
 * Serviço de Gerenciamento de Produtos com Bling
 *
 * ESTRATÉGIA RECOMENDADA PARA PRODUTOS:
 *
 * 1. FONTE ÚNICA DA VERDADE:
 *    - Sistema Local: Catálogo principal (preços, descrições, imagens)
 *    - Bling: Controle de estoque e movimentações
 *
 * 2. SINCRONIZAÇÃO BIDIRECIONAL:
 *    - Local → Bling: Produtos, preços, dados básicos
 *    - Bling → Local: Estoque, movimentações, custos
 *
 * 3. AUTOMAÇÃO INTELIGENTE:
 *    - Criação automática no Bling quando produto é criado localmente
 *    - Atualização de estoque em tempo real via webhooks
 *    - Sincronização de preços e promoções
 */
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
exports.ProductManagementService = void 0;
class ProductManagementService {
    constructor(config = {
        autoCreateInBling: true,
        autoUpdateStock: true,
        autoUpdatePrices: true,
        stockSource: 'BLING',
        priceSource: 'LOCAL'
    }) {
        this.config = config;
    }
    /**
     * 🆕 CRIAR PRODUTO COMPLETO
     * Cria produto localmente e sincroniza com Bling
     */
    createProduct(productData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🆕 Criando produto: ${productData.name}`);
                // 1. Criar produto localmente
                const localProduct = yield this.createLocalProduct(productData);
                // 2. Criar no Bling (se configurado)
                if (this.config.autoCreateInBling) {
                    const blingProduct = yield this.createBlingProduct(localProduct);
                    // 3. Atualizar referência local
                    yield this.updateLocalProductBlingId(localProduct.id, blingProduct.data.id);
                    // 4. Configurar estoque inicial
                    if (productData.blingStock && productData.blingStock > 0) {
                        yield this.setInitialStock(blingProduct.data.id, productData.blingStock);
                    }
                }
                console.log(`✅ Produto ${productData.name} criado e sincronizado`);
                return localProduct;
            }
            catch (error) {
                console.error('❌ Erro ao criar produto:', error);
                throw error;
            }
        });
    }
    /**
     * 📦 GERENCIAMENTO DE ESTOQUE
     * Controla estoque com sincronização automática
     */
    updateStock(productId, quantity, operation, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`📦 Atualizando estoque - Produto: ${productId}, Operação: ${operation}, Qtd: ${quantity}`);
                // 1. Buscar produto e validações
                const product = yield this.getProductData(productId);
                if (!product.blingId) {
                    throw new Error('Produto não está sincronizado com Bling');
                }
                // 2. Calcular nova quantidade
                let newQuantity;
                const currentStock = yield this.getCurrentStock(product.blingId);
                switch (operation) {
                    case 'SET':
                        newQuantity = quantity;
                        break;
                    case 'ADD':
                        newQuantity = currentStock + quantity;
                        break;
                    case 'SUBTRACT':
                        newQuantity = Math.max(0, currentStock - quantity);
                        break;
                }
                // 3. Atualizar no Bling
                yield this.updateBlingStock({
                    produto: { id: product.blingId },
                    operacao: 'B', // Balanço (ajuste total)
                    quantidade: newQuantity,
                    observacoes: reason || `Ajuste via sistema - ${operation}`
                });
                // 4. Atualizar cache local
                yield this.updateLocalStock(productId, newQuantity);
                console.log(`✅ Estoque atualizado: ${currentStock} → ${newQuantity}`);
                return { previousStock: currentStock, newStock: newQuantity };
            }
            catch (error) {
                console.error('❌ Erro ao atualizar estoque:', error);
                throw error;
            }
        });
    }
    /**
     * 💰 GERENCIAMENTO DE PREÇOS
     * Atualiza preços com estratégia configurável
     */
    updatePrice(productId, newPrice, salePrice) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`💰 Atualizando preço - Produto: ${productId}, Preço: R$ ${newPrice}`);
                const product = yield this.getProductData(productId);
                // 1. Atualizar localmente (sempre)
                yield this.updateLocalPrice(productId, newPrice, salePrice);
                // 2. Atualizar no Bling (se configurado)
                if (this.config.priceSource === 'LOCAL' && product.blingId) {
                    yield this.updateBlingPrice(product.blingId, {
                        preco: newPrice,
                        precoPromocional: salePrice
                    });
                }
                console.log(`✅ Preço atualizado para R$ ${newPrice}`);
                return { success: true, price: newPrice, salePrice };
            }
            catch (error) {
                console.error('❌ Erro ao atualizar preço:', error);
                throw error;
            }
        });
    }
    /**
     * 🔄 SINCRONIZAÇÃO COMPLETA
     * Sincroniza todos os produtos entre sistemas
     */
    syncAllProducts() {
        return __awaiter(this, arguments, void 0, function* (direction = 'BIDIRECTIONAL') {
            try {
                console.log(`🔄 Iniciando sincronização completa: ${direction}`);
                const results = {
                    synced: 0,
                    errors: 0,
                    created: 0,
                    updated: 0
                };
                if (direction === 'LOCAL_TO_BLING' || direction === 'BIDIRECTIONAL') {
                    // Sincronizar produtos locais para Bling
                    const localProducts = yield this.getUnsyncedLocalProducts();
                    for (const product of localProducts) {
                        try {
                            if (!product.blingId) {
                                // Criar no Bling
                                const blingProduct = yield this.createBlingProduct(product);
                                yield this.updateLocalProductBlingId(product.id, blingProduct.data.id);
                                results.created++;
                            }
                            else {
                                // Atualizar no Bling
                                yield this.updateBlingProduct(product.blingId, {
                                    nome: product.name,
                                    preco: product.price,
                                    descricaoCurta: product.description
                                });
                                results.updated++;
                            }
                            yield this.markProductAsSynced(product.id);
                            results.synced++;
                        }
                        catch (error) {
                            console.error(`❌ Erro ao sincronizar produto ${product.id}:`, error);
                            yield this.markProductSyncError(product.id, error.message || 'Erro desconhecido');
                            results.errors++;
                        }
                    }
                }
                if (direction === 'BLING_TO_LOCAL' || direction === 'BIDIRECTIONAL') {
                    // Sincronizar estoque do Bling para local
                    yield this.syncStockFromBling();
                }
                console.log(`✅ Sincronização concluída:`, results);
                return results;
            }
            catch (error) {
                console.error('❌ Erro na sincronização completa:', error);
                throw error;
            }
        });
    }
    /**
     * 📊 RELATÓRIO DE ESTOQUE
     * Gera relatório consolidado de estoque
     */
    getStockReport() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📊 Gerando relatório de estoque...');
                const products = yield this.getAllSyncedProducts();
                const report = [];
                for (const product of products) {
                    if (product.blingId) {
                        const blingStock = yield this.getCurrentStock(product.blingId);
                        const localStock = product.blingStock || 0;
                        report.push({
                            productId: product.id,
                            name: product.name,
                            blingId: product.blingId,
                            localStock,
                            blingStock,
                            difference: blingStock - localStock,
                            status: blingStock === localStock ? 'SYNCED' : 'DIVERGENT',
                            lastSync: product.lastSyncAt
                        });
                    }
                }
                console.log(`✅ Relatório gerado para ${report.length} produtos`);
                return {
                    totalProducts: report.length,
                    syncedProducts: report.filter(p => p.status === 'SYNCED').length,
                    divergentProducts: report.filter(p => p.status === 'DIVERGENT').length,
                    products: report
                };
            }
            catch (error) {
                console.error('❌ Erro ao gerar relatório:', error);
                throw error;
            }
        });
    }
    /**
     * 🔔 WEBHOOK DE ESTOQUE
     * Processa notificações de mudança de estoque do Bling
     */
    processStockWebhook(webhookData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log('🔔 Processando webhook de estoque:', webhookData.evento);
                if (webhookData.evento === 'estoque_alterado') {
                    const blingProductId = ((_a = webhookData.dados.produto) === null || _a === void 0 ? void 0 : _a.id) || webhookData.dados.id;
                    const newStock = webhookData.dados.estoque;
                    if (blingProductId && newStock !== undefined) {
                        // Buscar produto local pelo ID do Bling
                        const localProduct = yield this.getProductByBlingId(blingProductId);
                        if (localProduct) {
                            // Atualizar estoque local
                            yield this.updateLocalStock(localProduct.id, newStock);
                            console.log(`✅ Estoque atualizado via webhook: Produto ${localProduct.id} → ${newStock}`);
                        }
                    }
                }
                return { success: true, processed: true };
            }
            catch (error) {
                console.error('❌ Erro ao processar webhook:', error);
                throw error;
            }
        });
    }
    // ===================================
    // MÉTODOS AUXILIARES (IMPLEMENTAR)
    // ===================================
    createLocalProduct(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar criação no banco local
            return Object.assign(Object.assign({}, data), { id: Date.now(), syncStatus: 'PENDING' });
        });
    }
    createBlingProduct(product) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar criação no Bling via API
            return {
                data: {
                    id: Math.floor(Math.random() * 10000),
                    nome: product.name,
                    preco: product.price
                }
            };
        });
    }
    updateLocalProductBlingId(localId, blingId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar atualização da referência
            console.log(`Linking product ${localId} → Bling ${blingId}`);
        });
    }
    setInitialStock(blingId, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar configuração de estoque inicial
            console.log(`Setting initial stock for Bling ${blingId}: ${quantity}`);
        });
    }
    getProductData(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar busca do produto
            return {
                id: productId,
                name: 'Produto Exemplo',
                description: 'Descrição',
                price: 99.90,
                imageUrl: 'https://example.com/image.jpg',
                categoryId: 1,
                blingId: 123,
                syncStatus: 'SYNCED'
            };
        });
    }
    getCurrentStock(blingId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar consulta de estoque no Bling
            return 10;
        });
    }
    updateBlingStock(stockData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar atualização via Bling API
            console.log('Updating Bling stock:', stockData);
        });
    }
    updateLocalStock(productId, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar atualização local
            console.log(`Local stock updated: Product ${productId} → ${quantity}`);
        });
    }
    updateLocalPrice(productId, price, salePrice) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar atualização de preço local
            console.log(`Local price updated: Product ${productId} → R$ ${price}`);
        });
    }
    updateBlingPrice(blingId, priceData) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar atualização de preço no Bling
            console.log('Updating Bling price:', blingId, priceData);
        });
    }
    getUnsyncedLocalProducts() {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar busca de produtos não sincronizados
            return [];
        });
    }
    updateBlingProduct(blingId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar atualização no Bling
            console.log('Updating Bling product:', blingId, data);
        });
    }
    markProductAsSynced(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar marcação como sincronizado
            console.log(`Product ${productId} marked as synced`);
        });
    }
    markProductSyncError(productId, error) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar marcação de erro
            console.log(`Product ${productId} sync error: ${error}`);
        });
    }
    syncStockFromBling() {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar sincronização de estoque do Bling
            console.log('Syncing stock from Bling...');
        });
    }
    getAllSyncedProducts() {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar busca de todos os produtos sincronizados
            return [];
        });
    }
    getProductByBlingId(blingId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar busca por ID do Bling
            return null;
        });
    }
}
exports.ProductManagementService = ProductManagementService;
