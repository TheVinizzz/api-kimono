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
exports.syncProductsBySkus = exports.getSyncStatus = exports.syncProductBySku = exports.cleanupData = exports.previewSync = exports.syncCategories = exports.syncStock = exports.syncProducts = exports.syncAll = void 0;
const bling_sync_service_1 = require("../services/bling-sync.service");
// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value));
};
// ==========================================
// SINCRONIZAÇÃO COMPLETA
// ==========================================
const syncAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { syncProducts = 'true', syncCategories = 'true', syncStock = 'true', dryRun = 'false', limit = '100' } = req.query;
        console.log('🚀 Iniciando sincronização completa via API...');
        const options = {
            syncProducts: syncProducts === 'true',
            syncCategories: syncCategories === 'true',
            syncStock: syncStock === 'true',
            dryRun: dryRun === 'true',
            limit: parseInt(limit) || 100
        };
        const result = yield bling_sync_service_1.blingSyncService.syncAll(options);
        // Serializar BigInt nos detalhes antes de enviar resposta
        const serializedResult = serializeBigInt(result);
        return res.json({
            success: serializedResult.success,
            message: serializedResult.message,
            timestamp: new Date().toISOString(),
            options,
            stats: serializedResult.stats,
            details: serializedResult.details
        });
    }
    catch (error) {
        console.error('❌ Erro na sincronização completa:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na sincronização completa',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.syncAll = syncAll;
// ==========================================
// SINCRONIZAÇÃO APENAS DE PRODUTOS
// ==========================================
const syncProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { syncStock = 'true', dryRun = 'false', limit = '100' } = req.query;
        console.log('📦 Sincronizando apenas produtos...');
        const result = yield bling_sync_service_1.blingSyncService.syncAll({
            syncProducts: true,
            syncCategories: false,
            syncStock: syncStock === 'true',
            dryRun: dryRun === 'true',
            limit: parseInt(limit) || 100
        });
        // Serializar BigInt nos produtos antes de enviar resposta
        const serializedResult = serializeBigInt(result);
        return res.json({
            success: serializedResult.success,
            message: serializedResult.message,
            timestamp: new Date().toISOString(),
            stats: {
                processed: serializedResult.stats.processed,
                successful: serializedResult.stats.successful,
                failed: serializedResult.stats.failed,
                skipped: serializedResult.stats.skipped
            },
            details: serializedResult.details
        });
    }
    catch (error) {
        console.error('❌ Erro na sincronização de produtos:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na sincronização de produtos',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.syncProducts = syncProducts;
// ==========================================
// SINCRONIZAÇÃO APENAS DE ESTOQUE
// ==========================================
const syncStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dryRun = 'false', productIds } = req.query;
        console.log('📊 Sincronizando apenas estoque...');
        const options = {
            dryRun: dryRun === 'true'
        };
        // Processar IDs específicos se fornecidos
        if (productIds) {
            const ids = productIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (ids.length > 0) {
                options.productIds = ids;
            }
        }
        const result = yield bling_sync_service_1.blingSyncService.syncStockOnly(options);
        return res.json({
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString(),
            stats: {
                updated: result.updated,
                errors: result.errors
            },
            options
        });
    }
    catch (error) {
        console.error('❌ Erro na sincronização de estoque:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na sincronização de estoque',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.syncStock = syncStock;
// ==========================================
// SINCRONIZAÇÃO APENAS DE CATEGORIAS
// ==========================================
const syncCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dryRun = 'false' } = req.query;
        console.log('📂 Sincronizando apenas categorias...');
        const result = yield bling_sync_service_1.blingSyncService.syncAll({
            syncProducts: false,
            syncCategories: true,
            syncStock: false,
            dryRun: dryRun === 'true',
            limit: 1000
        });
        return res.json({
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString(),
            stats: {
                processed: result.stats.processed,
                successful: result.stats.successful,
                failed: result.stats.failed,
                skipped: result.stats.skipped
            },
            details: result.details
        });
    }
    catch (error) {
        console.error('❌ Erro na sincronização de categorias:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na sincronização de categorias',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.syncCategories = syncCategories;
// ==========================================
// PREVIEW/DRY RUN
// ==========================================
const previewSync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { limit = '20' } = req.query;
        console.log('👁️ Executando preview da sincronização...');
        const result = yield bling_sync_service_1.blingSyncService.syncAll({
            syncProducts: true,
            syncCategories: true,
            syncStock: true,
            dryRun: true,
            limit: parseInt(limit) || 20
        });
        // Serializar BigInt no preview antes de enviar resposta
        const serializedResult = serializeBigInt(result);
        return res.json({
            success: true,
            message: 'Preview da sincronização executado com sucesso',
            timestamp: new Date().toISOString(),
            preview: true,
            stats: serializedResult.stats,
            details: serializedResult.details,
            note: 'Este é apenas um preview. Nenhum dado foi alterado no banco.'
        });
    }
    catch (error) {
        console.error('❌ Erro no preview da sincronização:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro no preview da sincronização',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.previewSync = previewSync;
// ==========================================
// LIMPEZA DE DADOS
// ==========================================
const cleanupData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧹 Executando limpeza de dados órfãos...');
        const result = yield bling_sync_service_1.blingSyncService.cleanupOrphanedData();
        return res.json({
            success: result.success,
            message: result.message,
            timestamp: new Date().toISOString(),
            cleaned: result.cleaned
        });
    }
    catch (error) {
        console.error('❌ Erro na limpeza de dados:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na limpeza de dados',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.cleanupData = cleanupData;
// ==========================================
// SINCRONIZAÇÃO DE PRODUTO POR SKU
// ==========================================
const syncProductBySku = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sku } = req.params;
        if (!sku) {
            return res.status(400).json({
                success: false,
                message: 'SKU é obrigatório',
                timestamp: new Date().toISOString()
            });
        }
        console.log(`🔄 Sincronizando produto com SKU: ${sku}`);
        const product = yield bling_sync_service_1.blingSyncService.syncProductBySku(sku);
        // Serializar BigInt para string antes de enviar resposta
        const serializedProduct = serializeBigInt(product);
        return res.json({
            success: true,
            message: `Produto com SKU ${sku} sincronizado com sucesso`,
            timestamp: new Date().toISOString(),
            product: serializedProduct,
            stats: {
                processed: 1,
                successful: 1,
                failed: 0,
                imagesProcessed: serializedProduct.imagesProcessed || 0
            }
        });
    }
    catch (error) {
        console.error(`❌ Erro ao sincronizar produto com SKU ${req.params.sku}:`, error);
        return res.status(500).json({
            success: false,
            message: `Erro ao sincronizar produto com SKU ${req.params.sku}`,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.syncProductBySku = syncProductBySku;
// ==========================================
// STATUS DA SINCRONIZAÇÃO
// ==========================================
const getSyncStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        // Estatísticas do banco local
        const [totalProducts, totalCategories, totalVariants, totalImages, recentProducts] = yield Promise.all([
            prisma.product.count(),
            prisma.category.count(),
            prisma.productVariant.count(),
            prisma.productImage.count(),
            prisma.product.count({
                where: {
                    updatedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
                    }
                }
            })
        ]);
        yield prisma.$disconnect();
        return res.json({
            success: true,
            message: 'Status da sincronização obtido com sucesso',
            timestamp: new Date().toISOString(),
            database: {
                products: totalProducts,
                categories: totalCategories,
                variants: totalVariants,
                images: totalImages,
                recentlyUpdated: recentProducts
            },
            availableEndpoints: {
                syncAll: 'POST /api/bling-sync/all',
                syncProducts: 'POST /api/bling-sync/products',
                syncStock: 'POST /api/bling-sync/stock',
                syncCategories: 'POST /api/bling-sync/categories',
                preview: 'GET /api/bling-sync/preview',
                cleanup: 'POST /api/bling-sync/cleanup',
                status: 'GET /api/bling-sync/status'
            }
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter status:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao obter status da sincronização',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
exports.getSyncStatus = getSyncStatus;
// ==========================================
// SINCRONIZAÇÃO DE MÚLTIPLOS PRODUTOS POR SKUS
// ==========================================
const syncProductsBySkus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { skus } = req.body;
    if (!Array.isArray(skus) || skus.length === 0) {
        return res.status(400).json({ error: 'Lista de SKUs obrigatória' });
    }
    const results = [];
    for (const sku of skus) {
        try {
            const result = yield bling_sync_service_1.blingSyncService.syncProductBySku(sku);
            results.push({ sku, success: true, result });
        }
        catch (error) {
            results.push({ sku, success: false, error: error.message });
        }
    }
    // Sempre retorna 200 com o array de resultados, mesmo se houver erros
    const serializedResults = serializeBigInt(results);
    return res.status(200).json({ results: serializedResults });
});
exports.syncProductsBySkus = syncProductsBySkus;
