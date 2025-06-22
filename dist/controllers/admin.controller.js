"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.getDashboardStats = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Dashboard - obter estatísticas gerais
const getDashboardStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }
        // Contar total de usuários
        const usersCount = yield prisma.user.count();
        // Contar total de produtos
        const productsCount = yield prisma.product.count();
        // Contar total de pedidos
        const ordersCount = yield prisma.order.count();
        // Contar pedidos por status
        const ordersByStatus = yield prisma.order.groupBy({
            by: ['status'],
            _count: {
                id: true
            }
        });
        // Calcular receita total
        const totalRevenue = yield prisma.order.aggregate({
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
        const recentOrders = yield prisma.order.findMany({
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
        const lowStockProducts = yield prisma.product.findMany({
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
            }, {}),
            revenue: {
                total: totalRevenue._sum.total || 0
            },
            recentOrders,
            lowStockProducts
        });
    }
    catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        return res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
});
exports.getDashboardStats = getDashboardStats;
// Listar todos os usuários (admin)
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }
        const users = yield prisma.user.findMany({
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
    }
    catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});
exports.getAllUsers = getAllUsers;
