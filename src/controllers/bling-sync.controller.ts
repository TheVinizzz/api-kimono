import { Request, Response } from 'express';
import { blingSyncService } from '../services/bling-sync.service';

// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// ==========================================
// SINCRONIZAÇÃO COMPLETA
// ==========================================

export const syncAll = async (req: Request, res: Response) => {
  try {
    const {
      syncProducts = 'true',
      syncCategories = 'true', 
      syncStock = 'true',
      dryRun = 'false',
      limit = '100'
    } = req.query;

    console.log('🚀 Iniciando sincronização completa via API...');

    const options = {
      syncProducts: syncProducts === 'true',
      syncCategories: syncCategories === 'true',
      syncStock: syncStock === 'true',
      dryRun: dryRun === 'true',
      limit: parseInt(limit as string) || 100
    };

    const result = await blingSyncService.syncAll(options);

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

  } catch (error: any) {
    console.error('❌ Erro na sincronização completa:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na sincronização completa',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// SINCRONIZAÇÃO APENAS DE PRODUTOS
// ==========================================

export const syncProducts = async (req: Request, res: Response) => {
  try {
    const {
      syncStock = 'true',
      dryRun = 'false',
      limit = '100'
    } = req.query;

    console.log('📦 Sincronizando apenas produtos...');

    const result = await blingSyncService.syncAll({
      syncProducts: true,
      syncCategories: false,
      syncStock: syncStock === 'true',
      dryRun: dryRun === 'true',
      limit: parseInt(limit as string) || 100
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

  } catch (error: any) {
    console.error('❌ Erro na sincronização de produtos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na sincronização de produtos',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// SINCRONIZAÇÃO APENAS DE ESTOQUE
// ==========================================

export const syncStock = async (req: Request, res: Response) => {
  try {
    const {
      dryRun = 'false',
      productIds
    } = req.query;

    console.log('📊 Sincronizando apenas estoque...');

    const options: any = {
      dryRun: dryRun === 'true'
    };

    // Processar IDs específicos se fornecidos
    if (productIds) {
      const ids = (productIds as string).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        options.productIds = ids;
      }
    }

    const result = await blingSyncService.syncStockOnly(options);

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

  } catch (error: any) {
    console.error('❌ Erro na sincronização de estoque:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na sincronização de estoque',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// SINCRONIZAÇÃO APENAS DE CATEGORIAS
// ==========================================

export const syncCategories = async (req: Request, res: Response) => {
  try {
    const { dryRun = 'false' } = req.query;

    console.log('📂 Sincronizando apenas categorias...');

    const result = await blingSyncService.syncAll({
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

  } catch (error: any) {
    console.error('❌ Erro na sincronização de categorias:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na sincronização de categorias',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// PREVIEW/DRY RUN
// ==========================================

export const previewSync = async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;

    console.log('👁️ Executando preview da sincronização...');

    const result = await blingSyncService.syncAll({
      syncProducts: true,
      syncCategories: true,
      syncStock: true,
      dryRun: true,
      limit: parseInt(limit as string) || 20
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

  } catch (error: any) {
    console.error('❌ Erro no preview da sincronização:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro no preview da sincronização',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// LIMPEZA DE DADOS
// ==========================================

export const cleanupData = async (req: Request, res: Response) => {
  try {
    console.log('🧹 Executando limpeza de dados órfãos...');

    const result = await blingSyncService.cleanupOrphanedData();

    return res.json({
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
      cleaned: result.cleaned
    });

  } catch (error: any) {
    console.error('❌ Erro na limpeza de dados:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na limpeza de dados',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// SINCRONIZAÇÃO DE PRODUTO POR SKU
// ==========================================

export const syncProductBySku = async (req: Request, res: Response) => {
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

    const product = await blingSyncService.syncProductBySku(sku);

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

  } catch (error: any) {
    console.error(`❌ Erro ao sincronizar produto com SKU ${req.params.sku}:`, error);
    return res.status(500).json({
      success: false,
      message: `Erro ao sincronizar produto com SKU ${req.params.sku}`,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// STATUS DA SINCRONIZAÇÃO
// ==========================================

export const getSyncStatus = async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // Estatísticas do banco local
    const [
      totalProducts,
      totalCategories,
      totalVariants,
      totalImages,
      recentProducts
    ] = await Promise.all([
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

    await prisma.$disconnect();

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

  } catch (error: any) {
    console.error('❌ Erro ao obter status:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter status da sincronização',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// SINCRONIZAÇÃO DE MÚLTIPLOS PRODUTOS POR SKUS
// ==========================================

export const syncProductsBySkus = async (req: Request, res: Response) => {
  const { skus } = req.body;
  if (!Array.isArray(skus) || skus.length === 0) {
    return res.status(400).json({ error: 'Lista de SKUs obrigatória' });
  }

  const results = [];
  for (const sku of skus) {
    try {
      const result = await blingSyncService.syncProductBySku(sku);
      results.push({ sku, success: true, result });
    } catch (error: any) {
      results.push({ sku, success: false, error: error.message });
    }
  }

  // Sempre retorna 200 com o array de resultados, mesmo se houver erros
  const serializedResults = serializeBigInt(results);
  return res.status(200).json({ results: serializedResults });
}; 