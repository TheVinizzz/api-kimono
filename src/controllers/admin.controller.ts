import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dashboard - obter estatísticas gerais
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    // Contar total de usuários
    const usersCount = await prisma.user.count();
    
    // Contar total de produtos
    const productsCount = await prisma.product.count();
    
    // Contar total de pedidos
    const ordersCount = await prisma.order.count();
    
    // Contar pedidos por status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    
    // Calcular receita total
    const totalRevenue = await prisma.order.aggregate({
      where: {
        status: {
          in: ['PAID', 'SHIPPED', 'DELIVERED'] // Somente pedidos pagos
        }
      },
      _sum: {
        total: true
      }
    });
    
    // Pedidos recentes
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Produtos com estoque baixo
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lt: 10 // Estoque menor que 10 unidades
        }
      },
      orderBy: {
        stock: 'asc'
      },
      take: 5
    });

    return res.json({
      counts: {
        users: usersCount,
        products: productsCount,
        orders: ordersCount
      },
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>),
      revenue: {
        total: totalRevenue._sum.total || 0
      },
      recentOrders,
      lowStockProducts
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
};

// Listar todos os usuários (admin)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
}; 