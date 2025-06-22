import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Schema de validação para produto
const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string(),
  price: z.number().positive('Preço deve ser positivo'),
  originalPrice: z.number().positive('Preço original deve ser positivo').optional(),
  stock: z.number().int().nonnegative('Estoque não pode ser negativo'),
  imageUrl: z.string().url('URL da imagem inválida').optional(),
  categoryId: z.number(),
});

// Nova função para obter produtos filtrados
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

    // Buscar produtos com os filtros aplicados
    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: { 
        category: true,
        images: {
          orderBy: [
            { isMain: 'desc' },
            { order: 'asc' }
          ]
        }
      }
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

    return res.json(filteredProducts);
  } catch (error) {
    console.error('Erro ao filtrar produtos:', error);
    return res.status(500).json({ error: 'Erro ao filtrar produtos' });
  }
};

// Obter todos os produtos
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
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
    
    return res.json(products);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
};

// Obter produto por ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
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
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    return res.json(product);
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
    
    return res.status(201).json(newProduct);
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
    
    return res.json(updatedProduct);
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

// Este arquivo é apenas um exemplo de integração
// Para usar, adapte seus controllers existentes conforme necessário 