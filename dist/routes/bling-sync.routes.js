"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bling_sync_controller_1 = require("../controllers/bling-sync.controller");
const router = express_1.default.Router();
// ==========================================
// ROTAS DE SINCRONIZAÇÃO BLING → BANCO
// ==========================================
// Status da sincronização
router.get('/status', bling_sync_controller_1.getSyncStatus);
// Preview da sincronização (dry run)
router.get('/preview', bling_sync_controller_1.previewSync);
// Sincronização completa
router.post('/all', bling_sync_controller_1.syncAll);
// Sincronização específica
router.post('/products', bling_sync_controller_1.syncProducts);
router.post('/stock', bling_sync_controller_1.syncStock);
router.post('/categories', bling_sync_controller_1.syncCategories);
// Sincronização de produto por SKU
router.post('/product/:sku', bling_sync_controller_1.syncProductBySku);
// Sincronização de múltiplos produtos por SKUs
router.post('/products/batch', bling_sync_controller_1.syncProductsBySkus);
// Limpeza de dados
router.post('/cleanup', bling_sync_controller_1.cleanupData);
exports.default = router;
