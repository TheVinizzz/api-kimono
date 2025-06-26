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
router.post('/sync/product/:id', auth_1.auth, bling_controller_1.syncProductToBling);
// Sincronizar todos os produtos
router.post('/sync/products/all', auth_1.auth, bling_controller_1.syncAllProductsToBling);
// Sincronizar pedido específico
router.post('/sync/order/:id', auth_1.auth, bling_controller_1.syncOrderToBling);
// ===================
// ROTAS DE CONFIGURAÇÃO (Protegidas - apenas admin)
// ===================
// Obter configurações de sincronização
router.get('/config', auth_1.auth, bling_controller_1.getSyncConfig);
// Atualizar configurações de sincronização
router.put('/config', auth_1.auth, bling_controller_1.updateSyncConfig);
// ===================
// ROTAS DE CONSULTA BLING (Protegidas - apenas admin)
// ===================
// Listar produtos do Bling
router.get('/products', auth_1.auth, bling_controller_1.getBlingProducts);
// Listar pedidos do Bling
router.get('/orders', auth_1.auth, bling_controller_1.getBlingOrders);
// Obter estoque de produto no Bling
router.get('/products/:id/stock', auth_1.auth, bling_controller_1.getBlingProductStock);
// ===================
// WEBHOOKS (Públicas - validação interna)
// ===================
// Webhook do Bling (não requer autenticação pois vem do Bling)
router.post('/webhook', bling_controller_1.blingWebhook);
exports.default = router;
