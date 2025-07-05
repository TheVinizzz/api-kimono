import { Request, Response } from 'express';
import prisma from '../config/prisma';

// GET - Obter todas as marcas
export const getAllBrands = async (_req: Request, res: Response): Promise<void> => {
  try {
    const brands = await prisma.brand.findMany();
    res.json(brands);
  } catch (error) {
    console.error('Erro ao buscar marcas:', error);
    res.status(500).json({ error: 'Erro ao buscar marcas' });
  }
};

// GET - Obter marca por ID
export const getBrandById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    
    const brand = await prisma.brand.findUnique({
      where: { id }
    });
    
    if (!brand) {
      res.status(404).json({ error: 'Marca não encontrada' });
      return;
    }
    
    res.json(brand);
  } catch (error) {
    console.error('Erro ao buscar marca:', error);
    res.status(500).json({ error: 'Erro ao buscar marca' });
  }
};

// POST - Criar nova marca (apenas admin)
export const createBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, imageUrl } = req.body;
    
    // Validação básica
    if (!name) {
      res.status(400).json({ error: 'Nome da marca é obrigatório' });
      return;
    }
    
    // Verificar se a marca já existe
    const existingBrand = await prisma.brand.findFirst({
      where: { name }
    });
    
    if (existingBrand) {
      res.status(400).json({ error: 'Já existe uma marca com este nome' });
      return;
    }
    
    // Criar a marca
    const brand = await prisma.brand.create({
      data: {
        name,
        description: description || '',
        imageUrl: imageUrl || null
      }
    });
    
    res.status(201).json(brand);
  } catch (error) {
    console.error('Erro ao criar marca:', error);
    res.status(500).json({ error: 'Erro ao criar marca' });
  }
};

// PUT - Atualizar marca (apenas admin)
export const updateBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { name, description, imageUrl } = req.body;
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    
    // Validação básica
    if (!name) {
      res.status(400).json({ error: 'Nome da marca é obrigatório' });
      return;
    }
    
    // Verificar se a marca existe
    const existingBrand = await prisma.brand.findUnique({
      where: { id }
    });
    
    if (!existingBrand) {
      res.status(404).json({ error: 'Marca não encontrada' });
      return;
    }
    
    // Atualizar a marca
    const updatedBrand = await prisma.brand.update({
      where: { id },
      data: {
        name,
        description,
        imageUrl
      }
    });
    
    res.json(updatedBrand);
  } catch (error) {
    console.error('Erro ao atualizar marca:', error);
    
    // Verificar se é um erro de violação de chave única
    if ((error as any).code === 'P2002') {
      res.status(409).json({ error: 'Já existe uma marca com este nome' });
      return;
    }
    
    res.status(500).json({ error: 'Erro ao atualizar marca' });
  }
};

// DELETE - Remover marca (apenas admin)
export const deleteBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    
    // Verificar se a marca existe
    const existingBrand = await prisma.brand.findUnique({
      where: { id }
    });
    
    if (!existingBrand) {
      res.status(404).json({ error: 'Marca não encontrada' });
      return;
    }
    
    // Verificar se existem produtos associados à marca
    const productsCount = await prisma.product.count({
      where: { brandId: id }
    });
    
    if (productsCount > 0) {
      res.status(400).json({ error: 'Não é possível excluir uma marca com produtos associados' });
      return;
    }
    
    // Excluir a marca
    await prisma.brand.delete({
      where: { id }
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir marca:', error);
    res.status(500).json({ error: 'Erro ao excluir marca' });
  }
}; 