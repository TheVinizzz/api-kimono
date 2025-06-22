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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.getAllCategories = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// GET - Obter todas as categorias
const getAllCategories = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield prisma_1.default.category.findMany();
        res.json(categories);
    }
    catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});
exports.getAllCategories = getAllCategories;
// GET - Obter categoria por ID
const getCategoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const category = yield prisma_1.default.category.findUnique({
            where: { id }
        });
        if (!category) {
            res.status(404).json({ error: 'Categoria não encontrada' });
            return;
        }
        res.json(category);
    }
    catch (error) {
        console.error('Erro ao buscar categoria:', error);
        res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
});
exports.getCategoryById = getCategoryById;
// POST - Criar nova categoria (apenas admin)
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, imageUrl } = req.body;
        // Validação básica
        if (!name) {
            res.status(400).json({ error: 'Nome da categoria é obrigatório' });
            return;
        }
        // Verificar se a categoria já existe
        const existingCategory = yield prisma_1.default.category.findFirst({
            where: { name }
        });
        if (existingCategory) {
            res.status(400).json({ error: 'Já existe uma categoria com este nome' });
            return;
        }
        // Criar a categoria
        const category = yield prisma_1.default.category.create({
            data: {
                name,
                description: description || '',
                imageUrl: imageUrl || null
            }
        });
        res.status(201).json(category);
    }
    catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
});
exports.createCategory = createCategory;
// PUT - Atualizar categoria (apenas admin)
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existingCategory = yield prisma_1.default.category.findUnique({
            where: { id }
        });
        if (!existingCategory) {
            res.status(404).json({ error: 'Categoria não encontrada' });
            return;
        }
        // Atualizar a categoria
        const updatedCategory = yield prisma_1.default.category.update({
            where: { id },
            data: {
                name,
                description,
                imageUrl
            }
        });
        res.json(updatedCategory);
    }
    catch (error) {
        console.error('Erro ao atualizar categoria:', error);
        // Verificar se é um erro de violação de chave única
        if (error.code === 'P2002') {
            res.status(409).json({ error: 'Já existe uma categoria com este nome' });
            return;
        }
        res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
});
exports.updateCategory = updateCategory;
// DELETE - Remover categoria (apenas admin)
const deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        // Verificar se a categoria existe
        const existingCategory = yield prisma_1.default.category.findUnique({
            where: { id }
        });
        if (!existingCategory) {
            res.status(404).json({ error: 'Categoria não encontrada' });
            return;
        }
        // Verificar se existem produtos associados à categoria
        const productsCount = yield prisma_1.default.product.count({
            where: { categoryId: id }
        });
        if (productsCount > 0) {
            res.status(400).json({ error: 'Não é possível excluir uma categoria com produtos associados' });
            return;
        }
        // Excluir a categoria
        yield prisma_1.default.category.delete({
            where: { id }
        });
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Erro ao excluir categoria:', error);
        res.status(500).json({ error: 'Erro ao excluir categoria' });
    }
});
exports.deleteCategory = deleteCategory;
