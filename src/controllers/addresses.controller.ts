import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Obter todos os endereços do usuário logado
export const getUserAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    return res.json(addresses);
  } catch (error) {
    console.error('Erro ao buscar endereços:', error);
    return res.status(500).json({ error: 'Erro ao buscar endereços' });
  }
};

// Obter um endereço específico por ID
export const getAddressById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const address = await prisma.address.findFirst({
      where: { 
        id,
        userId
      }
    });
    
    if (!address) {
      return res.status(404).json({ error: 'Endereço não encontrado' });
    }
    
    return res.json(address);
  } catch (error) {
    console.error('Erro ao buscar endereço:', error);
    return res.status(500).json({ error: 'Erro ao buscar endereço' });
  }
};

// Criar um novo endereço
export const createAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const { 
      name, 
      street, 
      number, 
      complement, 
      neighborhood, 
      city, 
      state, 
      zipCode,
      isDefault
    } = req.body;
    
    // Validar campos obrigatórios
    if (!name || !street || !number || !neighborhood || !city || !state || !zipCode) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }
    
    // Se estiver criando como padrão, remover o padrão dos outros endereços
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }
    
    const newAddress = await prisma.address.create({
      data: {
        userId,
        name,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode,
        isDefault: isDefault || false
      }
    });
    
    return res.status(201).json(newAddress);
  } catch (error) {
    console.error('Erro ao criar endereço:', error);
    return res.status(500).json({ error: 'Erro ao criar endereço' });
  }
};

// Atualizar um endereço existente
export const updateAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    // Verificar se o endereço existe e pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: { 
        id,
        userId
      }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Endereço não encontrado' });
    }
    
    const { 
      name, 
      street, 
      number, 
      complement, 
      neighborhood, 
      city, 
      state, 
      zipCode,
      isDefault
    } = req.body;
    
    // Se estiver tornando este endereço como padrão, remover o padrão dos outros
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId,
          NOT: { id }
        },
        data: { isDefault: false }
      });
    }
    
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        name,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode,
        isDefault: isDefault || false
      }
    });
    
    return res.json(updatedAddress);
  } catch (error) {
    console.error('Erro ao atualizar endereço:', error);
    return res.status(500).json({ error: 'Erro ao atualizar endereço' });
  }
};

// Excluir um endereço
export const deleteAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    // Verificar se o endereço existe e pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: { 
        id,
        userId
      }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Endereço não encontrado' });
    }
    
    await prisma.address.delete({
      where: { id }
    });
    
    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir endereço:', error);
    return res.status(500).json({ error: 'Erro ao excluir endereço' });
  }
};

// Definir um endereço como padrão
export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    // Verificar se o endereço existe e pertence ao usuário
    const existingAddress = await prisma.address.findFirst({
      where: { 
        id,
        userId
      }
    });
    
    if (!existingAddress) {
      return res.status(404).json({ error: 'Endereço não encontrado' });
    }
    
    // Remover o padrão de todos os endereços do usuário
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });
    
    // Definir o endereço selecionado como padrão
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: { isDefault: true }
    });
    
    return res.json(updatedAddress);
  } catch (error) {
    console.error('Erro ao definir endereço padrão:', error);
    return res.status(500).json({ error: 'Erro ao definir endereço padrão' });
  }
}; 