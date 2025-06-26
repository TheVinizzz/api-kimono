import { Request, Response } from 'express';
import blingOAuthService from '../services/bling-oauth.service';

// ==========================================
// AUTENTICAÇÃO OAUTH
// ==========================================

// Autenticação automática (sem navegador)
export const authenticateAutomatically = async (req: Request, res: Response) => {
  try {
    const tokens = await blingOAuthService.authenticateAutomatically();
    
    return res.json({
      success: true,
      message: 'Autenticação automática realizada com sucesso',
      data: {
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in,
        authenticated: true,
        automatic: true
      }
    });
  } catch (error: any) {
    console.error('Erro na autenticação automática:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na autenticação automática',
      error: error.message,
      fallback: 'Use o fluxo OAuth manual se a autenticação automática não funcionar'
    });
  }
};

// Gerar URL de autorização
export const generateAuthUrl = async (req: Request, res: Response) => {
  try {
    const authUrl = blingOAuthService.generateAuthUrl();
    
    return res.json({
      success: true,
      message: 'URL de autorização gerada com sucesso',
      data: {
        authUrl,
        instructions: [
          '1. Abra a URL no navegador',
          '2. Faça login no Bling',
          '3. Autorize a aplicação',
          '4. Copie o código da URL de retorno',
          '5. Use o endpoint /auth/callback com o código'
        ]
      }
    });
  } catch (error: any) {
    console.error('Erro ao gerar URL de autorização:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar URL de autorização',
      error: error.message
    });
  }
};

// Processar callback OAuth (trocar código por tokens)
export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de autorização é obrigatório'
      });
    }

    const tokens = await blingOAuthService.exchangeCodeForTokens(code);
    
    return res.json({
      success: true,
      message: 'Autenticação realizada com sucesso',
      data: {
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in,
        authenticated: true
      }
    });
  } catch (error: any) {
    console.error('Erro no callback OAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar callback OAuth',
      error: error.message
    });
  }
};

// Verificar status da autenticação
export const checkAuthStatus = async (req: Request, res: Response) => {
  try {
    const status = blingOAuthService.getAuthStatus();
    
    return res.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('Erro ao verificar status de autenticação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar status de autenticação',
      error: error.message
    });
  }
};

// ==========================================
// OBTER DADOS DO BLING
// ==========================================

// Obter dados do Bling com autenticação automática
export const getBlingDataAuto = async (req: Request, res: Response) => {
  try {
    console.log('🚀 Tentando obter dados do Bling com autenticação automática...');
    
    const {
      includeCompany = 'true',
      includeProducts = 'true',
      includeCategories = 'true',
      includeOrders = 'true',
      productLimit = '20',
      orderLimit = '10'
    } = req.query;

    const options = {
      includeCompany: includeCompany === 'true',
      includeProducts: includeProducts === 'true',
      includeCategories: includeCategories === 'true',
      includeOrders: includeOrders === 'true',
      productLimit: parseInt(productLimit as string) || 20,
      orderLimit: parseInt(orderLimit as string) || 10
    };

    // Isso vai tentar autenticação automática se necessário
    const data = await blingOAuthService.getAllData(options);
    
    return res.json({
      success: true,
      message: 'Dados do Bling obtidos com sucesso (autenticação automática)',
      timestamp: new Date().toISOString(),
      automatic: true,
      data
    });
  } catch (error: any) {
    console.error('Erro ao obter dados automaticamente:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do Bling automaticamente',
      error: error.message,
      suggestion: 'Verifique se CLIENT_ID e CLIENT_SECRET estão corretos, ou use o fluxo OAuth manual'
    });
  }
};

// Obter dados completos do Bling
export const getBlingData = async (req: Request, res: Response) => {
  try {
    const {
      includeCompany = 'true',
      includeProducts = 'true',
      includeCategories = 'true',
      includeOrders = 'true',
      productLimit = '20',
      orderLimit = '10'
    } = req.query;

    const options = {
      includeCompany: includeCompany === 'true',
      includeProducts: includeProducts === 'true',
      includeCategories: includeCategories === 'true',
      includeOrders: includeOrders === 'true',
      productLimit: parseInt(productLimit as string) || 20,
      orderLimit: parseInt(orderLimit as string) || 10
    };

    const data = await blingOAuthService.getAllData(options);
    
    return res.json({
      success: true,
      message: 'Dados do Bling obtidos com sucesso',
      timestamp: new Date().toISOString(),
      data
    });
  } catch (error: any) {
    console.error('Erro ao obter dados do Bling:', error);
    
    // Se for erro de autenticação, retornar instruções
    if (error.message.includes('Token') || error.message.includes('login')) {
      return res.status(401).json({
        success: false,
        message: 'Erro de autenticação',
        error: error.message,
        authRequired: true,
        instructions: [
          '1. Use GET /api/bling/auth/url para obter URL de autorização',
          '2. Faça login no Bling',
          '3. Use POST /api/bling/auth/callback com o código retornado'
        ]
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do Bling',
      error: error.message
    });
  }
};

// Obter apenas produtos do Bling
export const getBlingProducts = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      active = ''
    } = req.query;

    const options = {
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
      search: search as string || undefined,
      active: active === 'true' ? true : active === 'false' ? false : undefined
    };

    const data = await blingOAuthService.getProducts(options);
    
    // Formatar produtos para resposta mais limpa
    const formattedProducts = data.products.map(product => ({
      id: product.id,
      name: product.nome,
      code: product.codigo,
      price: product.preco,
      active: product.situacao === 'Ativo',
      category: product.categoria?.descricao || 'Sem categoria',
      stock: product.estoques?.[0]?.saldoFisico || 0,
      virtualStock: product.estoques?.[0]?.saldoVirtual || 0,
      imageUrl: product.imagemURL || null,
      description: product.descricao || '',
      createdAt: product.dataCriacao,
      updatedAt: product.dataAlteracao
    }));
    
    return res.json({
      success: true,
      message: `${formattedProducts.length} produtos encontrados`,
      data: {
        products: formattedProducts,
        pagination: data.pagination,
        total: data.total,
        filters: options
      }
    });
  } catch (error: any) {
    console.error('Erro ao obter produtos do Bling:', error);
    
    if (error.message.includes('Token') || error.message.includes('login')) {
      return res.status(401).json({
        success: false,
        message: 'Erro de autenticação',
        error: error.message,
        authRequired: true
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter produtos do Bling',
      error: error.message
    });
  }
};

// Obter informações da empresa
export const getBlingCompany = async (req: Request, res: Response) => {
  try {
    const company = await blingOAuthService.getCompanyInfo();
    
    return res.json({
      success: true,
      message: 'Informações da empresa obtidas com sucesso',
      data: {
        company: {
          id: company.id,
          name: company.nome,
          email: company.email,
          phone: company.telefone,
          cnpj: company.cnpj
        }
      }
    });
  } catch (error: any) {
    console.error('Erro ao obter informações da empresa:', error);
    
    if (error.message.includes('Token') || error.message.includes('login')) {
      return res.status(401).json({
        success: false,
        message: 'Erro de autenticação',
        error: error.message,
        authRequired: true
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter informações da empresa',
      error: error.message
    });
  }
};

// Obter produto específico por ID
export const getBlingProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = parseInt(id);
    
    if (isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do produto inválido'
      });
    }

    const product = await blingOAuthService.getProductById(productId);
    
    const formattedProduct = {
      id: product.id,
      name: product.nome,
      code: product.codigo,
      price: product.preco,
      active: product.situacao === 'Ativo',
      category: product.categoria?.descricao || 'Sem categoria',
      stock: product.estoques?.[0]?.saldoFisico || 0,
      virtualStock: product.estoques?.[0]?.saldoVirtual || 0,
      imageUrl: product.imagemURL || null,
      description: product.descricao || '',
      createdAt: product.dataCriacao,
      updatedAt: product.dataAlteracao
    };
    
    return res.json({
      success: true,
      message: 'Produto encontrado',
      data: {
        product: formattedProduct
      }
    });
  } catch (error: any) {
    console.error('Erro ao obter produto por ID:', error);
    
    if (error.message.includes('Token') || error.message.includes('login')) {
      return res.status(401).json({
        success: false,
        message: 'Erro de autenticação',
        error: error.message,
        authRequired: true
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao obter produto',
      error: error.message
    });
  }
}; 