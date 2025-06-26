import express from 'express';
import {
  syncAll,
  syncProducts,
  syncStock,
  syncCategories,
  previewSync,
  cleanupData,
  getSyncStatus,
  syncProductBySku,
  syncProductsBySkus
} from '../controllers/bling-sync.controller';

const router = express.Router();

// ==========================================
// ROTAS DE SINCRONIZAÇÃO BLING → BANCO
// ==========================================

// Status da sincronização
router.get('/status', getSyncStatus);

// Preview da sincronização (dry run)
router.get('/preview', previewSync);

// Sincronização completa
router.post('/all', syncAll);

// Sincronização específica
router.post('/products', syncProducts);
router.post('/stock', syncStock);
router.post('/categories', syncCategories);

// Sincronização de produto por SKU
router.post('/product/:sku', syncProductBySku);

// Sincronização de múltiplos produtos por SKUs
router.post('/products/batch', syncProductsBySkus);

// Limpeza de dados
router.post('/cleanup', cleanupData);

export default router; 