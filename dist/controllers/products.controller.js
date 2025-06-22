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
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = exports.getFilteredProducts = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Schema de validação para produto
const productSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    description: zod_1.z.string(),
    price: zod_1.z.number().positive('Preço deve ser positivo'),
    originalPrice: zod_1.z.number().positive('Preço original deve ser positivo').optional(),
    stock: zod_1.z.number().int().nonnegative('Estoque não pode ser negativo'),
    imageUrl: zod_1.z.string().url('URL da imagem inválida').optional(),
    categoryId: zod_1.z.number(),
});
// Nova função para obter produtos filtrados
const getFilteredProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryId, search, minPrice, maxPrice, discount, sort } = req.query;
        // Construir o where para o Prisma
        const where = {};
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
            where.price = Object.assign(Object.assign({}, where.price), { gte: parseFloat(minPrice) });
        }
        if (maxPrice && !isNaN(Number(maxPrice))) {
            where.price = Object.assign(Object.assign({}, where.price), { lte: parseFloat(maxPrice) });
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
        let orderBy = { createdAt: 'desc' };
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
        const products = yield prisma.product.findMany({
            where,
            orderBy,
            include: { category: true }
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
    }
    catch (error) {
        console.error('Erro ao filtrar produtos:', error);
        return res.status(500).json({ error: 'Erro ao filtrar produtos' });
    }
});
exports.getFilteredProducts = getFilteredProducts;
// Obter todos os produtos
const getAllProducts = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.product.findMany({
            include: { category: true },
        });
        return res.json(products);
    }
    catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});
exports.getAllProducts = getAllProducts;
// Obter produto por ID
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const productId = Number(id);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const product = yield prisma.product.findUnique({
            where: { id: productId },
            include: { category: true },
        });
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        return res.json(product);
    }
    catch (error) {
        console.error('Erro ao buscar produto:', error);
        return res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});
exports.getProductById = getProductById;
// Criar produto
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const categoryExists = yield prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!categoryExists) {
            return res.status(400).json({ error: 'Categoria não encontrada' });
        }
        const newProduct = yield prisma.product.create({
            data: {
                name,
                description,
                price,
                originalPrice,
                stock,
                imageUrl,
                categoryId,
            },
            include: { category: true },
        });
        return res.status(201).json(newProduct);
    }
    catch (error) {
        console.error('Erro ao criar produto:', error);
        return res.status(500).json({ error: 'Erro ao criar produto' });
    }
});
exports.createProduct = createProduct;
// Atualizar produto
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const productId = Number(id);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        // Verificar se o produto existe
        const productExists = yield prisma.product.findUnique({
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
            const categoryExists = yield prisma.category.findUnique({
                where: { id: updateData.categoryId },
            });
            if (!categoryExists) {
                return res.status(400).json({ error: 'Categoria não encontrada' });
            }
        }
        const updatedProduct = yield prisma.product.update({
            where: { id: productId },
            data: updateData,
            include: { category: true },
        });
        return res.json(updatedProduct);
    }
    catch (error) {
        console.error('Erro ao atualizar produto:', error);
        return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});
exports.updateProduct = updateProduct;
// Excluir produto
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const productId = Number(id);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        // Verificar se o produto existe
        const productExists = yield prisma.product.findUnique({
            where: { id: productId },
        });
        if (!productExists) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        // Verificar se há itens de pedido relacionados a este produto
        const relatedOrderItems = yield prisma.orderItem.findFirst({
            where: { productId },
        });
        // Verificar se o usuário deseja forçar a exclusão
        const { force } = req.query;
        if (relatedOrderItems && !force) {
            // Implementar exclusão lógica (soft delete) em vez de exclusão física
            yield prisma.product.update({
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
                let deletedProductRef = yield prisma.product.findFirst({
                    where: {
                        name: "Produto Removido",
                        description: "Este produto foi removido permanentemente"
                    }
                });
                // Se não existir, vamos criar um produto especial para referência
                if (!deletedProductRef) {
                    deletedProductRef = yield prisma.product.create({
                        data: {
                            name: "Produto Removido",
                            description: "Este produto foi removido permanentemente",
                            price: 0,
                            stock: 0
                        }
                    });
                }
                // Atualizar todos os itens de pedido para apontar para o produto de referência
                yield prisma.orderItem.updateMany({
                    where: { productId },
                    data: { productId: deletedProductRef.id }
                });
                // Agora podemos excluir o produto original com segurança
                yield prisma.product.delete({
                    where: { id: productId },
                });
                return res.status(204).send();
            }
            catch (error) {
                console.error('Erro ao processar exclusão forçada:', error);
                return res.status(500).json({ error: 'Erro ao processar exclusão forçada do produto' });
            }
        }
        else {
            // Agora excluir o produto
            yield prisma.product.delete({
                where: { id: productId },
            });
            return res.status(204).send();
        }
    }
    catch (error) {
        console.error('Erro ao excluir produto:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
            return res.status(400).json({
                error: 'Não é possível excluir este produto porque ele está vinculado a pedidos existentes'
            });
        }
        return res.status(500).json({ error: 'Erro ao excluir produto' });
    }
});
exports.deleteProduct = deleteProduct;
