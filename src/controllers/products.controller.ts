import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// Schema de validação para produto
const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string(),
  price: z.number().positive('Preço deve ser positivo'),
  originalPrice: z.number().min(0, 'Preço original deve ser zero ou positivo').nullable().optional(),
  stock: z.number().int().nonnegative('Estoque não pode ser negativo'),
  imageUrl: z.string().url('URL da imagem inválida').or(z.literal('')).optional(),
  categoryId: z.number(),
});

// Schema de validação para variação de produto
const productVariantSchema = z.object({
  size: z.string().min(1, 'Tamanho é obrigatório'),
  price: z.number().positive('Preço deve ser positivo'),
  stock: z.number().int().nonnegative('Estoque não pode ser negativo'),
  sku: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Atualizar consultas existentes para incluir variants
const includeRelations = {
  category: true,
  images: {
    orderBy: [
      { isMain: 'desc' as const },
      { order: 'asc' as const }
    ]
  },
  variants: {
    where: { isActive: true },
    orderBy: { size: 'asc' as const }
  }
};

// Nova função para obter produtos filtrados (atualizada)
export const getFilteredProducts = async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      search,
      minPrice,
      maxPrice,
      discount,
      sort
    } = req.query;

    // Construir o where para o Prisma
    const where: Prisma.ProductWhereInput = {};

    // Filtrar por categoria
    if (categoryId && !isNaN(Number(categoryId))) {
      where.categoryId = Number(categoryId);
    }

    // Busca por texto no nome ou descrição do produto
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filtrar por faixa de preço
    if (minPrice && !isNaN(Number(minPrice))) {
      where.price = {
        ...(where.price as Prisma.DecimalFilter<"Product">),
        gte: parseFloat(minPrice as string)
      };
    }

    if (maxPrice && !isNaN(Number(maxPrice))) {
      where.price = {
        ...(where.price as Prisma.DecimalFilter<"Product">),
        lte: parseFloat(maxPrice as string)
      };
    }

    // Filtrar por desconto
    if (discount && typeof discount === 'string') {
      // Filtrar produtos que possuem preço original e um desconto
      where.originalPrice = { 
        not: null,
        gt: 0 // Garante que o preço original é positivo
      };
      
      // Adicionar condição para garantir que o preço original é maior que o preço atual
      where.AND = [
        {
          originalPrice: {
            gt: 0 // Condição adicional para ter certeza
          }
        }
      ];
      
      // Após buscar, filtraremos por percentual de desconto no próximo passo
    }

    // Definir a ordenação
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    
    if (sort && typeof sort === 'string') {
      switch (sort) {
        case 'price_asc':
          orderBy = { price: 'asc' };
          break;
        case 'price_desc':
          orderBy = { price: 'desc' };
          break;
        case 'name_asc':
          orderBy = { name: 'asc' };
          break;
        case 'name_desc':
          orderBy = { name: 'desc' };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'discount':
          // Ordenação por desconto é complexa e requer ordenação customizada
          // Implementamos essa lógica no frontend após buscar os produtos
          orderBy = { 
            originalPrice: 'desc', // Como aproximação, produtos com maior preço original primeiro
            price: 'asc' // E depois pelo menor preço atual
          };
          break;
        default:
          // Padrão: exibir produtos mais recentes
          orderBy = { createdAt: 'desc' };
      }
    }

    // Buscar produtos com os filtros aplicados (incluindo variants)
    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: includeRelations
    });

    // Filtrar por percentual de desconto (se necessário)
    let filteredProducts = [...products];
    
    if (discount && typeof discount === 'string') {
      filteredProducts = products.filter(product => {
        if (!product.originalPrice || product.originalPrice <= product.price) {
          return false; // Não tem desconto
        }
        
        // Calcular o percentual de desconto
        const discountPercent = 100 * (Number(product.originalPrice) - Number(product.price)) / Number(product.originalPrice);
        
        // Filtrar com base na faixa de desconto
        switch (discount) {
          case 'under-10':
            return discountPercent < 10;
          case '10-30':
            return discountPercent >= 10 && discountPercent < 30;
          case 'over-30':
            return discountPercent >= 30;
          default:
            return true;
        }
      });
    }

    // Serializar BigInt antes de enviar resposta
    const serializedProducts = serializeBigInt(filteredProducts);
    return res.json(serializedProducts);
  } catch (error) {
    console.error('Erro ao filtrar produtos:', error);
    return res.status(500).json({ error: 'Erro ao filtrar produtos' });
  }
};

// Obter todos os produtos (atualizada)
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: includeRelations,
    });
    
    // Serializar BigInt antes de enviar resposta
    const serializedProducts = serializeBigInt(products);
    return res.json(serializedProducts);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

// Obter produto por ID (atualizada)
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: includeRelations,
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Serializar BigInt antes de enviar resposta
    const serializedProduct = serializeBigInt(product);
    return res.json(serializedProduct);
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return res.status(500).json({ error: 'Erro ao buscar produto' });
  }
};

// Criar produto
export const createProduct = async (req: Request, res: Response) => {
  try {
    const validation = productSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }
    
    const { name, description, price, originalPrice, stock, imageUrl, categoryId } = validation.data;
    
    // Verificar se a categoria existe
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    
    if (!categoryExists) {
      return res.status(400).json({ error: 'Categoria não encontrada' });
    }
    
    // Ao criar ou editar produto, aceite imageUrl como string vazia
    if (typeof imageUrl !== 'string') {
      req.body.imageUrl = '';
    }
    
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price,
        originalPrice,
        stock,
        imageUrl,
        categoryId,
      },
      include: { 
        category: true,
        images: {
          orderBy: [
            { isMain: 'desc' },
            { order: 'asc' }
          ]
        }
      },
    });
    
    // Serializar BigInt antes de enviar resposta
    const serializedProduct = serializeBigInt(newProduct);
    return res.status(201).json(serializedProduct);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return res.status(500).json({ error: 'Erro ao criar produto' });
  }
};

// Atualizar produto
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Verificar se o produto existe
    const productExists = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!productExists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const validation = productSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }
    
    const updateData = validation.data;
    
    // Se categoryId estiver definido, verificar se a categoria existe
    if (updateData.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: updateData.categoryId },
      });
      
      if (!categoryExists) {
        return res.status(400).json({ error: 'Categoria não encontrada' });
      }
    }
    
    // Ao criar ou editar produto, aceite imageUrl como string vazia
    if (typeof updateData.imageUrl !== 'string') {
      updateData.imageUrl = '';
    }
    
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: { 
        category: true,
        images: {
          orderBy: [
            { isMain: 'desc' },
            { order: 'asc' }
          ]
        }
      },
    });
    
    // Serializar BigInt antes de enviar resposta
    const serializedProduct = serializeBigInt(updatedProduct);
    return res.json(serializedProduct);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
};

// Excluir produto
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Verificar se o produto existe
    const productExists = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!productExists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Verificar se há itens de pedido relacionados a este produto
    const relatedOrderItems = await prisma.orderItem.findFirst({
      where: { productId },
    });

    // Verificar se o usuário deseja forçar a exclusão
    const { force } = req.query;
    
    if (relatedOrderItems && !force) {
      // Implementar exclusão lógica (soft delete) em vez de exclusão física
      await prisma.product.update({
        where: { id: productId },
        data: { 
          stock: 0,
          // Poderia adicionar um campo 'isActive: false' ou similar se existir no modelo
          name: `[INDISPONÍVEL] ${productExists.name}`
        }
      });
      
      return res.status(200).json({ 
        message: 'Produto marcado como indisponível pois existem pedidos associados a ele',
        success: true,
        hasRelatedOrders: true 
      });
    }
    
    // Se não houver registros relacionados ou a exclusão for forçada, excluir fisicamente
    if (relatedOrderItems && force) {
      try {
        // Em vez de tentar atualizar as referências, vamos lidar com os itens de pedido
        // Primeiro, precisamos verificar se existe um produto "deletado" para referência
        let deletedProductRef = await prisma.product.findFirst({
          where: { 
            name: "Produto Removido",
            description: "Este produto foi removido permanentemente"
          }
        });
        
        // Se não existir, vamos criar um produto especial para referência
        if (!deletedProductRef) {
          deletedProductRef = await prisma.product.create({
            data: {
              name: "Produto Removido",
              description: "Este produto foi removido permanentemente",
              price: 0,
              stock: 0
            }
          });
        }
        
        // Atualizar todos os itens de pedido para apontar para o produto de referência
        await prisma.orderItem.updateMany({
          where: { productId },
          data: { productId: deletedProductRef.id }
        });
        
        // Agora podemos excluir o produto original com segurança
        await prisma.product.delete({
          where: { id: productId },
        });
        
        return res.status(204).send();
      } catch (error) {
        console.error('Erro ao processar exclusão forçada:', error);
        return res.status(500).json({ error: 'Erro ao processar exclusão forçada do produto' });
      }
    } else {
      // Agora excluir o produto
      await prisma.product.delete({
        where: { id: productId },
      });
      
      return res.status(204).send();
    }
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return res.status(400).json({ 
        error: 'Não é possível excluir este produto porque ele está vinculado a pedidos existentes'
      });
    }
    return res.status(500).json({ error: 'Erro ao excluir produto' });
  }
};

// ===== NOVAS FUNÇÕES PARA GERENCIAR VARIAÇÕES =====

// Criar variação de produto
export const createProductVariant = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const productIdNum = Number(productId);
    
    if (isNaN(productIdNum)) {
      return res.status(400).json({ error: 'ID do produto inválido' });
    }

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({ where: { id: productIdNum } });
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const validation = productVariantSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }

    const { size, price, stock, sku, isActive } = validation.data;

    // Verificar se já existe uma variação com o mesmo tamanho
    const existingVariant = await prisma.productVariant.findUnique({
      where: { productId_size: { productId: productIdNum, size } }
    });

    if (existingVariant) {
      return res.status(400).json({ error: `Já existe uma variação com o tamanho ${size}` });
    }

    const newVariant = await prisma.productVariant.create({
      data: {
        productId: productIdNum,
        size,
        price,
        stock,
        sku,
        isActive
      }
    });

    // Serializar BigInt antes de enviar resposta
    const serializedVariant = serializeBigInt(newVariant);
    return res.status(201).json(serializedVariant);
  } catch (error) {
    console.error('Erro ao criar variação:', error);
    return res.status(500).json({ error: 'Erro ao criar variação do produto' });
  }
};

// Atualizar variação de produto
export const updateProductVariant = async (req: Request, res: Response) => {
  try {
    const { productId, variantId } = req.params;
    const productIdNum = Number(productId);
    const variantIdNum = Number(variantId);
    
    if (isNaN(productIdNum) || isNaN(variantIdNum)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    // Verificar se a variação existe
    const existingVariant = await prisma.productVariant.findFirst({
      where: { id: variantIdNum, productId: productIdNum }
    });

    if (!existingVariant) {
      return res.status(404).json({ error: 'Variação não encontrada' });
    }

    const validation = productVariantSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }

    const updateData = validation.data;

    // Se o tamanho está sendo alterado, verificar se não existe conflito
    if (updateData.size && updateData.size !== existingVariant.size) {
      const sizeConflict = await prisma.productVariant.findUnique({
        where: { productId_size: { productId: productIdNum, size: updateData.size } }
      });

      if (sizeConflict) {
        return res.status(400).json({ error: `Já existe uma variação com o tamanho ${updateData.size}` });
      }
    }

    const updatedVariant = await prisma.productVariant.update({
      where: { id: variantIdNum },
      data: updateData
    });

    // Serializar BigInt antes de enviar resposta
    const serializedVariant = serializeBigInt(updatedVariant);
    return res.json(serializedVariant);
  } catch (error) {
    console.error('Erro ao atualizar variação:', error);
    return res.status(500).json({ error: 'Erro ao atualizar variação do produto' });
  }
};

// Deletar variação de produto
export const deleteProductVariant = async (req: Request, res: Response) => {
  try {
    const { productId, variantId } = req.params;
    const productIdNum = Number(productId);
    const variantIdNum = Number(variantId);
    
    if (isNaN(productIdNum) || isNaN(variantIdNum)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    // Verificar se a variação existe
    const existingVariant = await prisma.productVariant.findFirst({
      where: { id: variantIdNum, productId: productIdNum }
    });

    if (!existingVariant) {
      return res.status(404).json({ error: 'Variação não encontrada' });
    }

    // Verificar se há pedidos relacionados a esta variação
    const relatedOrderItems = await prisma.orderItem.findFirst({
      where: { productVariantId: variantIdNum }
    });

    if (relatedOrderItems) {
      // Marcar como inativa em vez de deletar
      await prisma.productVariant.update({
        where: { id: variantIdNum },
        data: { isActive: false, stock: 0 }
      });

      return res.json({ 
        message: 'Variação marcada como inativa pois existem pedidos associados',
        inactivated: true 
      });
    }

    // Deletar a variação
    await prisma.productVariant.delete({
      where: { id: variantIdNum }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar variação:', error);
    return res.status(500).json({ error: 'Erro ao deletar variação do produto' });
  }
};

// Obter variações de um produto
export const getProductVariants = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const productIdNum = Number(productId);
    
    if (isNaN(productIdNum)) {
      return res.status(400).json({ error: 'ID do produto inválido' });
    }

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({ where: { id: productIdNum } });
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId: productIdNum },
      orderBy: { size: 'asc' }
    });

    // Serializar BigInt antes de enviar resposta
    const serializedVariants = serializeBigInt(variants);
    return res.json(serializedVariants);
  } catch (error) {
    console.error('Erro ao buscar variações:', error);
    return res.status(500).json({ error: 'Erro ao buscar variações do produto' });
  }
};

// Criar múltiplas variações de uma vez
export const createMultipleVariants = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const productIdNum = Number(productId);
    
    if (isNaN(productIdNum)) {
      return res.status(400).json({ error: 'ID do produto inválido' });
    }

    // Verificar se o produto existe
    const product = await prisma.product.findUnique({ where: { id: productIdNum } });
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const { variants } = req.body;
    
    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ error: 'Lista de variações é obrigatória' });
    }

    // Validar todas as variações
    const validatedVariants = [];
    for (const variant of variants) {
      const validation = productVariantSchema.safeParse(variant);
      if (!validation.success) {
        return res.status(400).json({ 
          error: `Dados inválidos para variação ${variant.size}`, 
          details: validation.error.format() 
        });
      }
      validatedVariants.push({ ...validation.data, productId: productIdNum });
    }

    // Verificar se algum tamanho já existe
    const existingSizes = await prisma.productVariant.findMany({
      where: { 
        productId: productIdNum,
        size: { in: validatedVariants.map(v => v.size) }
      },
      select: { size: true }
    });

    if (existingSizes.length > 0) {
      return res.status(400).json({ 
        error: `Os seguintes tamanhos já existem: ${existingSizes.map(s => s.size).join(', ')}` 
      });
    }

    // Criar todas as variações
    const createdVariants = await prisma.productVariant.createMany({
      data: validatedVariants
    });

    // Buscar as variações criadas para retornar
    const newVariants = await prisma.productVariant.findMany({
      where: { productId: productIdNum },
      orderBy: { size: 'asc' }
    });

    // Serializar BigInt antes de enviar resposta
    const serializedVariants = serializeBigInt(newVariants);
    return res.status(201).json(serializedVariants);
  } catch (error) {
    console.error('Erro ao criar múltiplas variações:', error);
    return res.status(500).json({ error: 'Erro ao criar variações do produto' });
  }
};

// Este arquivo é apenas um exemplo de integração
// Para usar, adapte seus controllers existentes conforme necessário 