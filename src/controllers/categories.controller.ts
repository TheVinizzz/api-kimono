import { Request, Response } from 'express';
import prisma from '../config/prisma';

// GET - Obter todas as categorias
export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
};

// GET - Obter categoria por ID
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    
    const category = await prisma.category.findUnique({
      where: { id }
    });
    
    if (!category) {
      res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }
    
    res.json(category);
  } catch (error) {
    console.error('Erro ao buscar categoria:', error);
    res.status(500).json({ error: 'Erro ao buscar categoria' });
  }
};

// POST - Criar nova categoria (apenas admin)
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, imageUrl } = req.body;
    
    // Validação básica
    if (!name) {
      res.status(400).json({ error: 'Nome da categoria é obrigatório' });
      return;
    }
    
    // Verificar se a categoria já existe
    const existingCategory = await prisma.category.findFirst({
      where: { name }
    });
    
    if (existingCategory) {
      res.status(400).json({ error: 'Já existe uma categoria com este nome' });
      return;
    }
    
    // Criar a categoria
    const category = await prisma.category.create({
      data: {
        name,
        description: description || '',
        imageUrl: imageUrl || null
      }
    });
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
};

// PUT - Atualizar categoria (apenas admin)
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { name, description, imageUrl } = req.body;
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    
    // Validação básica
    if (!name) {
      res.status(400).json({ error: 'Nome da categoria é obrigatório' });
      return;
    }
    
    // Verificar se a categoria existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });
    
    if (!existingCategory) {
      res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }
    
    // Atualizar a categoria
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        imageUrl
      }
    });
    
    res.json(updatedCategory);
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    
    // Verificar se é um erro de violação de chave única
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Já existe uma categoria com este nome' });
      return;
    }
    
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
};

// DELETE - Remover categoria (apenas admin)
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    
    // Verificar se a categoria existe
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });
    
    if (!existingCategory) {
      res.status(404).json({ error: 'Categoria não encontrada' });
      return;
    }
    
    // Verificar se existem produtos associados à categoria
    const productsCount = await prisma.product.count({
      where: { categoryId: id }
    });
    
    if (productsCount > 0) {
      res.status(400).json({ error: 'Não é possível excluir uma categoria com produtos associados' });
      return;
    }
    
    // Excluir a categoria
    await prisma.category.delete({
      where: { id }
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
}; 