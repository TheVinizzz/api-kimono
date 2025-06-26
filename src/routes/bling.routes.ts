import express from 'express';
import { auth, isAdmin } from '../middleware/auth';
import {
  syncProductToBling,
  syncAllProductsToBling,
  syncOrderToBling,
  getSyncConfig,
  updateSyncConfig,
  getBlingProducts,
  getBlingOrders,
  getBlingProductStock,
  blingWebhook,
  checkOAuthStatus,
  getBlingData,
  getBlingProductsDetailed,
  testBlingConnection,
  syncStockFromBling
} from '../controllers/bling.controller';

const router = express.Router();

// ===================
// ROTAS DE SINCRONIZAÇÃO (Protegidas - apenas admin)
// ===================

// Sincronizar produto específico
router.post('/sync/product/:id', auth, isAdmin, syncProductToBling);

// Sincronizar todos os produtos
router.post('/sync/products/all', auth, isAdmin, syncAllProductsToBling);

// Sincronizar pedido específico
router.post('/sync/order/:id', auth, isAdmin, syncOrderToBling);

// ===================
// ROTAS DE CONFIGURAÇÃO (Protegidas - apenas admin)
// ===================

// Obter configurações de sincronização
router.get('/config', auth, isAdmin, getSyncConfig);

// Atualizar configurações de sincronização
router.put('/config', auth, isAdmin, updateSyncConfig);

// ===================
// ROTAS DE CONSULTA BLING (Protegidas - apenas admin)
// ===================

// Listar produtos do Bling
router.get('/products', auth, isAdmin, getBlingProducts);

// Listar pedidos do Bling
router.get('/orders', auth, isAdmin, getBlingOrders);

// Obter estoque de produto no Bling
router.get('/products/:id/stock', auth, isAdmin, getBlingProductStock);

// ===================
// OAUTH E TESTES (Protegidas - apenas admin)
// ===================

// Verificar status da autenticação OAuth
router.get('/oauth/status', auth, isAdmin, checkOAuthStatus);

// Testar conectividade com Bling
router.get('/test/connection', auth, isAdmin, testBlingConnection);

// Obter todos os dados do Bling (empresa, produtos, pedidos, etc.)
router.get('/data', auth, isAdmin, getBlingData);

// Obter produtos detalhados do Bling com filtros
router.get('/data/products', auth, isAdmin, getBlingProductsDetailed);

// Sincronizar estoque específico do Bling para o sistema local
router.put('/sync/stock/:productId', auth, isAdmin, syncStockFromBling);

// ===================
// WEBHOOKS (Públicas - validação interna)
// ===================

// Webhook do Bling (não requer autenticação pois vem do Bling)
router.post('/webhook', blingWebhook);

export default router; 