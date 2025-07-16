"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const bling_controller_1 = require("../controllers/bling.controller");
const router = express_1.default.Router();
// ===================
// ROTAS DE SINCRONIZAÇÃO (Protegidas - apenas admin)
// ===================
// Sincronizar produto específico
router.post('/sync/product/:id', auth_1.auth, auth_1.isAdmin, bling_controller_1.syncProductToBling);
// Sincronizar todos os produtos
router.post('/sync/products/all', auth_1.auth, auth_1.isAdmin, bling_controller_1.syncAllProductsToBling);
// Sincronizar pedido específico
router.post('/sync/order/:id', auth_1.auth, auth_1.isAdmin, bling_controller_1.syncOrderToBling);
// ===================
// ROTAS DE CONFIGURAÇÃO (Protegidas - apenas admin)
// ===================
// Obter configurações de sincronização
router.get('/config', auth_1.auth, auth_1.isAdmin, bling_controller_1.getSyncConfig);
// Atualizar configurações de sincronização
router.put('/config', auth_1.auth, auth_1.isAdmin, bling_controller_1.updateSyncConfig);
// ===================
// ROTAS DE CONSULTA BLING (Protegidas - apenas admin)
// ===================
// Listar produtos do Bling
router.get('/products', auth_1.auth, auth_1.isAdmin, bling_controller_1.getBlingProducts);
// Listar pedidos do Bling
router.get('/orders', auth_1.auth, auth_1.isAdmin, bling_controller_1.getBlingOrders);
// Obter estoque de produto no Bling
router.get('/products/:id/stock', auth_1.auth, auth_1.isAdmin, bling_controller_1.getBlingProductStock);
// ===================
// OAUTH E TESTES (Protegidas - apenas admin)
// ===================
// Verificar status da autenticação OAuth
router.get('/oauth/status', auth_1.auth, auth_1.isAdmin, bling_controller_1.checkOAuthStatus);
// Testar conectividade com Bling
router.get('/test/connection', auth_1.auth, auth_1.isAdmin, bling_controller_1.testBlingConnection);
// Obter todos os dados do Bling (empresa, produtos, pedidos, etc.)
router.get('/data', auth_1.auth, auth_1.isAdmin, bling_controller_1.getBlingData);
// Obter produtos detalhados do Bling com filtros
router.get('/data/products', auth_1.auth, auth_1.isAdmin, bling_controller_1.getBlingProductsDetailed);
// Sincronizar estoque específico do Bling para o sistema local
router.put('/sync/stock/:productId', auth_1.auth, auth_1.isAdmin, bling_controller_1.syncStockFromBling);
// ===================
// WEBHOOKS (Públicas - validação interna)
// ===================
// Webhook do Bling (não requer autenticação pois vem do Bling)
router.post('/webhook', bling_controller_1.blingWebhook);
exports.default = router;
