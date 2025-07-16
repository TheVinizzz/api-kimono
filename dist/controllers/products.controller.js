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
exports.createMultipleVariants = exports.getProductVariants = exports.deleteProductVariant = exports.updateProductVariant = exports.createProductVariant = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = exports.getFilteredProducts = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value));
};
// Schema de validação para produto
const productSchema = zod_1.z.object({
    name: zod_1.z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    description: zod_1.z.string(),
    price: zod_1.z.number().positive('Preço deve ser positivo'),
    originalPrice: zod_1.z.number().min(0, 'Preço original deve ser zero ou positivo').nullable().optional(),
    stock: zod_1.z.number().int().nonnegative('Estoque não pode ser negativo'),
    imageUrl: zod_1.z.string().url('URL da imagem inválida').or(zod_1.z.literal('')).optional(),
    categoryId: zod_1.z.number(),
    brandId: zod_1.z.number().optional(),
    // Campos de peso e dimensões para cálculo de frete
    weight: zod_1.z.number().positive('Peso deve ser positivo').min(0.1, 'Peso mínimo é 0.1kg'),
    height: zod_1.z.number().positive('Altura deve ser positiva').min(1, 'Altura mínima é 1cm'),
    width: zod_1.z.number().positive('Largura deve ser positiva').min(1, 'Largura mínima é 1cm'),
    length: zod_1.z.number().positive('Comprimento deve ser positivo').min(1, 'Comprimento mínimo é 1cm'),
});
// Schema de validação para variação de produto
const productVariantSchema = zod_1.z.object({
    size: zod_1.z.string().min(1, 'Tamanho é obrigatório'),
    price: zod_1.z.number().positive('Preço deve ser positivo'),
    stock: zod_1.z.number().int().nonnegative('Estoque não pode ser negativo'),
    sku: zod_1.z.string().optional(),
    weight: zod_1.z.number().positive('Peso deve ser positivo').min(0.1, 'Peso mínimo é 0.1kg').optional(),
    isActive: zod_1.z.boolean().default(true),
});
// Atualizar consultas existentes para incluir variants
const includeRelations = {
    category: true,
    brand: true,
    images: {
        orderBy: [
            { isMain: 'desc' },
            { order: 'asc' }
        ]
    },
    variants: {
        where: { isActive: true },
        orderBy: { size: 'asc' }
    }
};
// Nova função para obter produtos filtrados (atualizada)
const getFilteredProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryId, brandId, search, minPrice, maxPrice, discount, sort } = req.query;
        // Construir o where para o Prisma
        const where = {};
        // Filtrar por categoria
        if (categoryId && !isNaN(Number(categoryId))) {
            where.categoryId = Number(categoryId);
        }
        // Filtrar por marca
        if (brandId && !isNaN(Number(brandId))) {
            where.brandId = Number(brandId);
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
        // Buscar produtos com os filtros aplicados (incluindo variants)
        const products = yield prisma.product.findMany({
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
    }
    catch (error) {
        console.error('Erro ao filtrar produtos:', error);
        return res.status(500).json({ error: 'Erro ao filtrar produtos' });
    }
});
exports.getFilteredProducts = getFilteredProducts;
// Obter todos os produtos (atualizada)
const getAllProducts = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield prisma.product.findMany({
            include: includeRelations,
        });
        // Serializar BigInt antes de enviar resposta
        const serializedProducts = serializeBigInt(products);
        return res.json(serializedProducts);
    }
    catch (error) {
        console.error('Erro ao buscar produtos:', error);
        return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});
exports.getAllProducts = getAllProducts;
// Obter produto por ID (atualizada)
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const productId = Number(id);
        if (isNaN(productId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const product = yield prisma.product.findUnique({
            where: { id: productId },
            include: includeRelations,
        });
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        // Serializar BigInt antes de enviar resposta
        const serializedProduct = serializeBigInt(product);
        return res.json(serializedProduct);
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
        const { name, description, price, originalPrice, stock, imageUrl, categoryId, brandId } = validation.data;
        // Verificar se a categoria existe
        const categoryExists = yield prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!categoryExists) {
            return res.status(400).json({ error: 'Categoria não encontrada' });
        }
        // Verificar se a marca existe (se fornecida)
        if (brandId) {
            const brandExists = yield prisma.brand.findUnique({
                where: { id: brandId },
            });
            if (!brandExists) {
                return res.status(400).json({ error: 'Marca não encontrada' });
            }
        }
        // Ao criar ou editar produto, aceite imageUrl como string vazia
        if (typeof imageUrl !== 'string') {
            req.body.imageUrl = '';
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
                brandId,
            },
            include: {
                category: true,
                brand: true,
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
        // Se brandId estiver definido, verificar se a marca existe
        if (updateData.brandId) {
            const brandExists = yield prisma.brand.findUnique({
                where: { id: updateData.brandId },
            });
            if (!brandExists) {
                return res.status(400).json({ error: 'Marca não encontrada' });
            }
        }
        // Ao criar ou editar produto, aceite imageUrl como string vazia
        if (typeof updateData.imageUrl !== 'string') {
            updateData.imageUrl = '';
        }
        const updatedProduct = yield prisma.product.update({
            where: { id: productId },
            data: updateData,
            include: {
                category: true,
                brand: true,
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
// ===== NOVAS FUNÇÕES PARA GERENCIAR VARIAÇÕES =====
// Criar variação de produto
const createProductVariant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const productIdNum = Number(productId);
        if (isNaN(productIdNum)) {
            return res.status(400).json({ error: 'ID do produto inválido' });
        }
        // Verificar se o produto existe
        const product = yield prisma.product.findUnique({ where: { id: productIdNum } });
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
        const existingVariant = yield prisma.productVariant.findUnique({
            where: { productId_size: { productId: productIdNum, size } }
        });
        if (existingVariant) {
            return res.status(400).json({ error: `Já existe uma variação com o tamanho ${size}` });
        }
        const newVariant = yield prisma.productVariant.create({
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
    }
    catch (error) {
        console.error('Erro ao criar variação:', error);
        return res.status(500).json({ error: 'Erro ao criar variação do produto' });
    }
});
exports.createProductVariant = createProductVariant;
// Atualizar variação de produto
const updateProductVariant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, variantId } = req.params;
        const productIdNum = Number(productId);
        const variantIdNum = Number(variantId);
        if (isNaN(productIdNum) || isNaN(variantIdNum)) {
            return res.status(400).json({ error: 'IDs inválidos' });
        }
        // Verificar se a variação existe
        const existingVariant = yield prisma.productVariant.findFirst({
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
            const sizeConflict = yield prisma.productVariant.findUnique({
                where: { productId_size: { productId: productIdNum, size: updateData.size } }
            });
            if (sizeConflict) {
                return res.status(400).json({ error: `Já existe uma variação com o tamanho ${updateData.size}` });
            }
        }
        const updatedVariant = yield prisma.productVariant.update({
            where: { id: variantIdNum },
            data: updateData
        });
        // Serializar BigInt antes de enviar resposta
        const serializedVariant = serializeBigInt(updatedVariant);
        return res.json(serializedVariant);
    }
    catch (error) {
        console.error('Erro ao atualizar variação:', error);
        return res.status(500).json({ error: 'Erro ao atualizar variação do produto' });
    }
});
exports.updateProductVariant = updateProductVariant;
// Deletar variação de produto
const deleteProductVariant = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, variantId } = req.params;
        const productIdNum = Number(productId);
        const variantIdNum = Number(variantId);
        if (isNaN(productIdNum) || isNaN(variantIdNum)) {
            return res.status(400).json({ error: 'IDs inválidos' });
        }
        // Verificar se a variação existe
        const existingVariant = yield prisma.productVariant.findFirst({
            where: { id: variantIdNum, productId: productIdNum }
        });
        if (!existingVariant) {
            return res.status(404).json({ error: 'Variação não encontrada' });
        }
        // Verificar se há pedidos relacionados a esta variação
        const relatedOrderItems = yield prisma.orderItem.findFirst({
            where: { productVariantId: variantIdNum }
        });
        if (relatedOrderItems) {
            // Marcar como inativa em vez de deletar
            yield prisma.productVariant.update({
                where: { id: variantIdNum },
                data: { isActive: false, stock: 0 }
            });
            return res.json({
                message: 'Variação marcada como inativa pois existem pedidos associados',
                inactivated: true
            });
        }
        // Deletar a variação
        yield prisma.productVariant.delete({
            where: { id: variantIdNum }
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Erro ao deletar variação:', error);
        return res.status(500).json({ error: 'Erro ao deletar variação do produto' });
    }
});
exports.deleteProductVariant = deleteProductVariant;
// Obter variações de um produto
const getProductVariants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const productIdNum = Number(productId);
        if (isNaN(productIdNum)) {
            return res.status(400).json({ error: 'ID do produto inválido' });
        }
        // Verificar se o produto existe
        const product = yield prisma.product.findUnique({ where: { id: productIdNum } });
        if (!product) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        const variants = yield prisma.productVariant.findMany({
            where: { productId: productIdNum },
            orderBy: { size: 'asc' }
        });
        // Serializar BigInt antes de enviar resposta
        const serializedVariants = serializeBigInt(variants);
        return res.json(serializedVariants);
    }
    catch (error) {
        console.error('Erro ao buscar variações:', error);
        return res.status(500).json({ error: 'Erro ao buscar variações do produto' });
    }
});
exports.getProductVariants = getProductVariants;
// Criar múltiplas variações de uma vez
const createMultipleVariants = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const productIdNum = Number(productId);
        if (isNaN(productIdNum)) {
            return res.status(400).json({ error: 'ID do produto inválido' });
        }
        // Verificar se o produto existe
        const product = yield prisma.product.findUnique({ where: { id: productIdNum } });
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
            validatedVariants.push(Object.assign(Object.assign({}, validation.data), { productId: productIdNum }));
        }
        // Verificar se algum tamanho já existe
        const existingSizes = yield prisma.productVariant.findMany({
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
        const createdVariants = yield prisma.productVariant.createMany({
            data: validatedVariants
        });
        // Buscar as variações criadas para retornar
        const newVariants = yield prisma.productVariant.findMany({
            where: { productId: productIdNum },
            orderBy: { size: 'asc' }
        });
        // Serializar BigInt antes de enviar resposta
        const serializedVariants = serializeBigInt(newVariants);
        return res.status(201).json(serializedVariants);
    }
    catch (error) {
        console.error('Erro ao criar múltiplas variações:', error);
        return res.status(500).json({ error: 'Erro ao criar variações do produto' });
    }
});
exports.createMultipleVariants = createMultipleVariants;
// Este arquivo é apenas um exemplo de integração
// Para usar, adapte seus controllers existentes conforme necessário 
