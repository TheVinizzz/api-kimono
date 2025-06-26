import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import blingService from '../services/bling.service';
import { BlingWebhookData } from '../types/bling.types';
import path from 'path';
import fs from 'fs';

// Importar funções do script OAuth
const { 
  makeAuthenticatedRequest, 
  getCompanyInfo, 
  getProducts, 
  getCategories, 
  getOrders,
  loadTokens,
  saveTokens,
  refreshAccessToken,
  isTokenExpired 
} = require('../../scripts/bling-oauth-complete');

// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// Schema para validação de webhook
const webhookSchema = z.object({
  evento: z.string(),
  dados: z.object({
    id: z.number(),
    numero: z.string().optional(),
    situacao: z.string().optional()
  }).passthrough()
});

// Schema para configuração de sincronização
const syncConfigSchema = z.object({
  syncProducts: z.boolean().optional(),
  syncOrders: z.boolean().optional(),
  syncStock: z.boolean().optional(),
  syncCustomers: z.boolean().optional(),
  autoUpdateStock: z.boolean().optional(),
  defaultCategory: z.number().optional(),
  defaultStore: z.number().optional()
});

// ===================
// SINCRONIZAÇÃO
// ===================

// Sincronizar produto específico para o Bling
export const syncProductToBling = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do produto inválido'
      });
    }

    // Buscar produto no banco local
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }

    // Sincronizar com Bling
    const blingProduct = await blingService.syncProductToBling({
      id: product.id,
      name: product.name,
      code: product.id.toString(),
      price: product.price,
      active: true, // Assumindo que produtos ativos são sincronizados
      description: product.description,
      minStock: 0, // Campo não existe no schema atual
      imageUrl: product.imageUrl || product.images?.[0]?.imageUrl,
      category: product.category?.name
    });

    if (!blingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao sincronizar produto com Bling'
      });
    }

    // Salvar ID do Bling no produto local (se necessário)
    await prisma.product.update({
      where: { id: productId },
      data: {
        // Você pode adicionar um campo blingId na tabela Product
        // blingId: blingProduct.id
      }
    });

    return res.json({
      success: true,
      message: 'Produto sincronizado com sucesso',
      blingProduct
    });

  } catch (error: any) {
    console.error('Erro ao sincronizar produto:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Sincronizar todos os produtos para o Bling
export const syncAllProductsToBling = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { stock: { gte: 0 } }, // Buscar produtos com estoque >= 0
      include: {
        category: true,
        images: true
      }
    });

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        const blingProduct = await blingService.syncProductToBling({
          id: product.id,
          name: product.name,
          code: product.id.toString(),
          price: product.price,
          active: true, // Assumindo que produtos são ativos
          description: product.description,
          minStock: 0, // Campo não existe no schema atual
          imageUrl: product.imageUrl || product.images?.[0]?.imageUrl,
          category: product.category?.name
        });

        if (blingProduct) {
          successCount++;
          results.push({
            productId: product.id,
            productName: product.name,
            blingId: blingProduct.id,
            status: 'success'
          });
        } else {
          errorCount++;
          results.push({
            productId: product.id,
            productName: product.name,
            status: 'error',
            message: 'Falha na sincronização'
          });
        }

        // Delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        errorCount++;
        results.push({
          productId: product.id,
          productName: product.name,
          status: 'error',
          message: error.message
        });
      }
    }

    return res.json({
      success: true,
      message: `Sincronização concluída: ${successCount} sucessos, ${errorCount} erros`,
      summary: {
        total: products.length,
        success: successCount,
        errors: errorCount
      },
      results
    });

  } catch (error: any) {
    console.error('Erro ao sincronizar produtos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Sincronizar pedido específico para o Bling
export const syncOrderToBling = async (req: Request, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do pedido inválido'
      });
    }

    // Buscar pedido no banco local
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Sincronizar com Bling
    const blingOrder = await blingService.syncOrderToBling({
      id: order.id,
      total: order.total,
      customerName: order.user?.name || order.customerName,
      customerEmail: order.user?.email || order.customerEmail,
      customerPhone: order.customerPhone,
      customerDocument: '', // Campo não existe no schema atual
      shippingAddress: order.shippingAddress ? {
        street: order.shippingAddress,
        number: '',
        neighborhood: '',
        zipCode: '',
        city: '',
        state: ''
      } : undefined,
      items: order.items?.map((item: any) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price
      })),
      notes: '' // Campo não existe no schema atual
    });

    if (!blingOrder) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao sincronizar pedido com Bling'
      });
    }

    // Salvar ID do Bling no pedido local (se necessário)
    await prisma.order.update({
      where: { id: orderId },
      data: {
        // Você pode adicionar um campo blingId na tabela Order
        // blingId: blingOrder.id
      }
    });

    return res.json({
      success: true,
      message: 'Pedido sincronizado com sucesso',
      blingOrder
    });

  } catch (error: any) {
    console.error('Erro ao sincronizar pedido:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// ===================
// CONFIGURAÇÕES
// ===================

// Obter configurações de sincronização
export const getSyncConfig = async (req: Request, res: Response) => {
  try {
    const config = blingService.getSyncConfig();
    
    return res.json({
      success: true,
      config
    });

  } catch (error: any) {
    console.error('Erro ao obter configurações:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Atualizar configurações de sincronização
export const updateSyncConfig = async (req: Request, res: Response) => {
  try {
    const validatedData = syncConfigSchema.parse(req.body);
    
    blingService.setSyncConfig(validatedData);
    
    return res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      config: blingService.getSyncConfig()
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }

    console.error('Erro ao atualizar configurações:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// ===================
// CONSULTAS BLING
// ===================

// Listar produtos do Bling
export const getBlingProducts = async (req: Request, res: Response) => {
  try {
    const products = await blingService.getAllProducts();
    // Serializar BigInt antes de enviar resposta
    const serializedProducts = serializeBigInt(products);
    res.json({ success: true, data: serializedProducts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Listar pedidos do Bling
export const getBlingOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const orders = await blingService.getOrders(page, limit);
    
    return res.json({
      success: true,
      orders: orders.data,
      pagination: {
        page: orders.pagina,
        limit: orders.limite,
        total: orders.total
      }
    });

  } catch (error: any) {
    console.error('Erro ao buscar pedidos do Bling:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar pedidos do Bling',
      error: error.message
    });
  }
};

// Obter estoque de um produto no Bling
export const getBlingProductStock = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do produto inválido'
      });
    }

    const stock = await blingService.getProductStock(productId);
    
    return res.json({
      success: true,
      stock: stock.data
    });

  } catch (error: any) {
    console.error('Erro ao buscar estoque do Bling:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar estoque do Bling',
      error: error.message
    });
  }
};

// ===================
// WEBHOOKS
// ===================

// Processar webhook do Bling
export const blingWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Webhook recebido do Bling:', req.body);

    // Validar dados do webhook
    const webhookData = webhookSchema.parse(req.body) as BlingWebhookData;
    
    // Processar webhook
    const result = blingService.processWebhook(webhookData);
    
    // Processar diferentes tipos de eventos
    switch (result.event) {
      case 'pedido_venda_alterado':
        await handleOrderStatusChange(result.data);
        break;
      case 'produto_alterado':
        await handleProductChange(result.data);
        break;
      case 'estoque_alterado':
        await handleStockChange(result.data);
        break;
      default:
        console.log(`Evento ${result.event} processado mas não requer ação específica`);
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso',
      event: result.event
    });

  } catch (error: any) {
    console.error('Erro ao processar webhook do Bling:', error);
    
    // Retornar 200 mesmo com erro para evitar reenvios desnecessários
    return res.status(200).json({
      success: false,
      message: 'Erro ao processar webhook',
      error: error.message
    });
  }
};

// ===================
// FUNÇÕES AUXILIARES
// ===================

// Processar alteração de status de pedido
async function handleOrderStatusChange(orderData: any) {
  try {
    // Buscar pedido local pelo número ou ID do Bling
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderData.numeroLoja ? parseInt(orderData.numeroLoja) : undefined },
          // { blingId: orderData.id } // Se você tiver campo blingId
        ]
      }
    });

    if (order) {
      const newStatus = blingService.mapBlingStatusToSystemStatus(orderData.situacao);
      
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus as any }
      });

      console.log(`Status do pedido ${order.id} atualizado para ${newStatus}`);
    } else {
      console.log(`Pedido ${orderData.numeroLoja || orderData.id} não encontrado localmente`);
    }
  } catch (error) {
    console.error('Erro ao processar alteração de pedido:', error);
  }
}

// Processar alteração de produto
async function handleProductChange(productData: any) {
  try {
    // Buscar produto local pelo código ou ID do Bling
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productData.codigo ? parseInt(productData.codigo) : undefined },
          // { blingId: productData.id } // Se você tiver campo blingId
        ]
      }
    });

    if (product) {
      console.log(`Produto ${product.id} foi alterado no Bling`);
      // Aqui você pode implementar a sincronização reversa se necessário
    } else {
      console.log(`Produto ${productData.codigo || productData.id} não encontrado localmente`);
    }
  } catch (error) {
    console.error('Erro ao processar alteração de produto:', error);
  }
}

// Processar alteração de estoque
async function handleStockChange(stockData: any) {
  try {
    // Buscar produto local
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: stockData.codigo ? parseInt(stockData.codigo) : undefined },
          // { blingId: stockData.id } // Se você tiver campo blingId
        ]
      }
    });

    if (product && blingService.getSyncConfig().autoUpdateStock) {
      // Obter estoque atual do Bling
      const blingStock = await blingService.getProductStock(stockData.id);
      
      if (blingStock.data && typeof blingStock.data.saldo === 'number') {
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: blingStock.data.saldo }
        });

        console.log(`Estoque do produto ${product.id} atualizado para ${blingStock.data.saldo}`);
      }
    }
  } catch (error) {
    console.error('Erro ao processar alteração de estoque:', error);
  }
}

// ===================
// OAUTH E TESTES
// ===================

// Verificar status da autenticação OAuth
export const checkOAuthStatus = async (req: Request, res: Response) => {
  try {
    const tokens = loadTokens();
    
    if (!tokens) {
      return res.json({
        success: false,
        authenticated: false,
        message: 'Nenhum token OAuth encontrado. Execute a autenticação primeiro.',
        authUrl: 'Execute: node scripts/bling-oauth-complete.js'
      });
    }

    if (isTokenExpired(tokens)) {
      return res.json({
        success: false,
        authenticated: false,
        expired: true,
        message: 'Token OAuth expirado. Execute a autenticação novamente.',
        authUrl: 'Execute: node scripts/bling-oauth-complete.js'
      });
    }

    return res.json({
      success: true,
      authenticated: true,
      message: 'Autenticação OAuth válida',
      tokenInfo: {
        expiresAt: new Date(tokens.expires_at),
        tokenType: tokens.token_type,
        hasRefreshToken: !!tokens.refresh_token
      }
    });

  } catch (error: any) {
    console.error('Erro ao verificar status OAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter dados completos do Bling (empresa, produtos, pedidos, etc.)
export const getBlingData = async (req: Request, res: Response) => {
  try {
    // Verificar autenticação
    const tokens = loadTokens();
    if (!tokens || isTokenExpired(tokens)) {
      return res.status(401).json({
        success: false,
        message: 'Token OAuth inválido ou expirado. Execute a autenticação primeiro.',
        authRequired: true
      });
    }

    const { 
      includeCompany = true, 
      includeProducts = true, 
      includeCategories = true, 
      includeOrders = true, 
      includeContacts = true,
      includeStock = true,
      productLimit = 20,
      orderLimit = 10,
      contactLimit = 10
    } = req.query;

    const data: any = {
      timestamp: new Date().toISOString(),
      authenticated: true
    };

    // Obter informações da empresa
    if (includeCompany === 'true') {
      try {
        const response = await makeAuthenticatedRequest('/empresas');
        if (response && response.statusCode === 200) {
          const companies = response.data.data || response.data;
          data.company = Array.isArray(companies) && companies.length > 0 ? companies[0] : null;
        }
      } catch (error) {
        console.error('Erro ao obter empresa:', error);
        data.company = { error: 'Erro ao obter dados da empresa' };
      }
    }

    // Obter produtos
    if (includeProducts === 'true') {
      try {
        const response = await makeAuthenticatedRequest(`/produtos?limite=${productLimit}&pagina=1`);
        if (response && response.statusCode === 200) {
          data.products = {
            items: response.data.data || response.data,
            pagination: response.data.pagination || null
          };
        }
      } catch (error) {
        console.error('Erro ao obter produtos:', error);
        data.products = { error: 'Erro ao obter produtos' };
      }
    }

    // Obter categorias
    if (includeCategories === 'true') {
      try {
        const response = await makeAuthenticatedRequest('/categorias');
        if (response && response.statusCode === 200) {
          data.categories = {
            items: response.data.data || response.data,
            pagination: response.data.pagination || null
          };
        }
      } catch (error) {
        console.error('Erro ao obter categorias:', error);
        data.categories = { error: 'Erro ao obter categorias' };
      }
    }

    // Obter pedidos
    if (includeOrders === 'true') {
      try {
        const response = await makeAuthenticatedRequest(`/pedidos/vendas?limite=${orderLimit}&pagina=1`);
        if (response && response.statusCode === 200) {
          data.orders = {
            items: response.data.data || response.data,
            pagination: response.data.pagination || null
          };
        }
      } catch (error) {
        console.error('Erro ao obter pedidos:', error);
        data.orders = { error: 'Erro ao obter pedidos' };
      }
    }

    // Obter contatos
    if (includeContacts === 'true') {
      try {
        const response = await makeAuthenticatedRequest(`/contatos?limite=${contactLimit}&pagina=1`);
        if (response && response.statusCode === 200) {
          data.contacts = {
            items: response.data.data || response.data,
            pagination: response.data.pagination || null
          };
        }
      } catch (error) {
        console.error('Erro ao obter contatos:', error);
        data.contacts = { error: 'Erro ao obter contatos' };
      }
    }

    // Obter estoque
    if (includeStock === 'true') {
      try {
        const response = await makeAuthenticatedRequest('/estoques');
        if (response && response.statusCode === 200) {
          data.stock = {
            items: response.data.data || response.data,
            pagination: response.data.pagination || null
          };
        }
      } catch (error) {
        console.error('Erro ao obter estoque:', error);
        data.stock = { error: 'Erro ao obter estoque' };
      }
    }

    // Estatísticas resumidas
    data.summary = {
      companyConfigured: !!data.company && !data.company.error,
      totalProducts: data.products?.items?.length || 0,
      totalCategories: data.categories?.items?.length || 0,
      totalOrders: data.orders?.items?.length || 0,
      totalContacts: data.contacts?.items?.length || 0,
      totalStockItems: data.stock?.items?.length || 0
    };

    return res.json({
      success: true,
      message: 'Dados do Bling obtidos com sucesso',
      data
    });

  } catch (error: any) {
    console.error('Erro ao obter dados do Bling:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Obter apenas produtos do Bling com filtros
export const getBlingProductsDetailed = async (req: Request, res: Response) => {
  try {
    // Verificar autenticação
    const tokens = loadTokens();
    if (!tokens || isTokenExpired(tokens)) {
      return res.status(401).json({
        success: false,
        message: 'Token OAuth inválido ou expirado',
        authRequired: true
      });
    }

    const { 
      page = 1, 
      limit = 20,
      search = '',
      category = '',
      active = ''
    } = req.query;

    let endpoint = `/produtos?limite=${limit}&pagina=${page}`;
    
    // Adicionar filtros se fornecidos
    if (search) endpoint += `&pesquisa=${encodeURIComponent(search as string)}`;
    if (category) endpoint += `&categoria=${category}`;
    if (active) endpoint += `&situacao=${active === 'true' ? 'Ativo' : 'Inativo'}`;

    const response = await makeAuthenticatedRequest(endpoint);
    
    if (response && response.statusCode === 200) {
      const products = response.data.data || response.data;
      const pagination = response.data.pagination || null;

      // Enriquecer dados dos produtos
      const enrichedProducts = products.map((product: any) => ({
        id: product.id,
        name: product.nome,
        code: product.codigo,
        price: product.preco,
        stock: product.estoques?.[0]?.saldoFisico || 0,
        virtualStock: product.estoques?.[0]?.saldoVirtual || 0,
        category: product.categoria?.descricao || 'Sem categoria',
        active: product.situacao === 'Ativo',
        imageUrl: product.imagemURL || null,
        description: product.descricao || '',
        createdAt: product.dataCriacao,
        updatedAt: product.dataAlteracao
      }));

      return res.json({
        success: true,
        message: `${enrichedProducts.length} produtos encontrados`,
        data: {
          products: enrichedProducts,
          pagination,
          filters: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            search,
            category,
            active
          }
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Erro ao obter produtos do Bling',
        statusCode: response?.statusCode
      });
    }

  } catch (error: any) {
    console.error('Erro ao obter produtos detalhados:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};

// Testar conectividade com Bling
export const testBlingConnection = async (req: Request, res: Response) => {
  try {
    // Verificar autenticação
    const tokens = loadTokens();
    if (!tokens) {
      return res.json({
        success: false,
        connected: false,
        message: 'Nenhum token OAuth encontrado',
        authRequired: true
      });
    }

    if (isTokenExpired(tokens)) {
      return res.json({
        success: false,
        connected: false,
        message: 'Token OAuth expirado',
        expired: true,
        authRequired: true
      });
    }

    // Testar conexão fazendo uma requisição simples
    const response = await makeAuthenticatedRequest('/empresas');
    
    if (response && response.statusCode === 200) {
      const companies = response.data.data || response.data;
      const company = Array.isArray(companies) && companies.length > 0 ? companies[0] : null;

      return res.json({
        success: true,
        connected: true,
        message: 'Conexão com Bling estabelecida com sucesso',
        data: {
          apiStatus: 'OK',
          responseTime: new Date().toISOString(),
          company: company ? {
            name: company.nome,
            email: company.email,
            id: company.id
          } : null,
          tokenInfo: {
            type: tokens.token_type,
            expiresAt: new Date(tokens.expires_at),
            hasRefreshToken: !!tokens.refresh_token
          }
        }
      });
    } else {
      return res.json({
        success: false,
        connected: false,
        message: 'Falha na conexão com Bling',
        statusCode: response?.statusCode,
        error: response?.data
      });
    }

  } catch (error: any) {
    console.error('Erro ao testar conexão:', error);
    return res.status(500).json({
      success: false,
      connected: false,
      message: 'Erro ao testar conexão com Bling',
      error: error.message
    });
  }
};

// Sincronizar estoque específico do Bling para o sistema local
export const syncStockFromBling = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    // Verificar autenticação
    const tokens = loadTokens();
    if (!tokens || isTokenExpired(tokens)) {
      return res.status(401).json({
        success: false,
        message: 'Token OAuth inválido ou expirado',
        authRequired: true
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'ID do produto é obrigatório'
      });
    }

    // Buscar produto no Bling
    const response = await makeAuthenticatedRequest(`/produtos/${productId}`);
    
    if (response && response.statusCode === 200) {
      const blingProduct = response.data.data || response.data;
      
      // Buscar produto local correspondente
      const localProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { id: parseInt(productId) },
            { name: blingProduct.nome }
          ]
        }
      });

      if (!localProduct) {
        return res.status(404).json({
          success: false,
          message: 'Produto não encontrado no sistema local'
        });
      }

      // Atualizar estoque local com dados do Bling
      const newStock = blingProduct.estoques?.[0]?.saldoFisico || 0;
      
      const updatedProduct = await prisma.product.update({
        where: { id: localProduct.id },
        data: {
          stock: newStock,
          price: blingProduct.preco || localProduct.price
        }
      });

      return res.json({
        success: true,
        message: 'Estoque sincronizado com sucesso',
        data: {
          productId: localProduct.id,
          productName: localProduct.name,
          oldStock: localProduct.stock,
          newStock: newStock,
          blingData: {
            id: blingProduct.id,
            name: blingProduct.nome,
            price: blingProduct.preco,
            stock: newStock
          }
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado no Bling'
      });
    }

  } catch (error: any) {
    console.error('Erro ao sincronizar estoque:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
}; 