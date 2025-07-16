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
exports.deleteBrand = exports.updateBrand = exports.createBrand = exports.getBrandById = exports.getAllBrands = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
// GET - Obter todas as marcas
const getAllBrands = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const brands = yield prisma_1.default.brand.findMany();
        res.json(brands);
    }
    catch (error) {
        console.error('Erro ao buscar marcas:', error);
        res.status(500).json({ error: 'Erro ao buscar marcas' });
    }
});
exports.getAllBrands = getAllBrands;
// GET - Obter marca por ID
const getBrandById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const brand = yield prisma_1.default.brand.findUnique({
            where: { id }
        });
        if (!brand) {
            res.status(404).json({ error: 'Marca não encontrada' });
            return;
        }
        res.json(brand);
    }
    catch (error) {
        console.error('Erro ao buscar marca:', error);
        res.status(500).json({ error: 'Erro ao buscar marca' });
    }
});
exports.getBrandById = getBrandById;
// POST - Criar nova marca (apenas admin)
const createBrand = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, imageUrl } = req.body;
        // Validação básica
        if (!name) {
            res.status(400).json({ error: 'Nome da marca é obrigatório' });
            return;
        }
        // Verificar se a marca já existe
        const existingBrand = yield prisma_1.default.brand.findFirst({
            where: { name }
        });
        if (existingBrand) {
            res.status(400).json({ error: 'Já existe uma marca com este nome' });
            return;
        }
        // Criar a marca
        const brand = yield prisma_1.default.brand.create({
            data: {
                name,
                description: description || '',
                imageUrl: imageUrl || null
            }
        });
        res.status(201).json(brand);
    }
    catch (error) {
        console.error('Erro ao criar marca:', error);
        res.status(500).json({ error: 'Erro ao criar marca' });
    }
});
exports.createBrand = createBrand;
// PUT - Atualizar marca (apenas admin)
const updateBrand = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existingBrand = yield prisma_1.default.brand.findUnique({
            where: { id }
        });
        if (!existingBrand) {
            res.status(404).json({ error: 'Marca não encontrada' });
            return;
        }
        // Atualizar a marca
        const updatedBrand = yield prisma_1.default.brand.update({
            where: { id },
            data: {
                name,
                description,
                imageUrl
            }
        });
        res.json(updatedBrand);
    }
    catch (error) {
        console.error('Erro ao atualizar marca:', error);
        // Verificar se é um erro de violação de chave única
        if (error.code === 'P2002') {
            res.status(409).json({ error: 'Já existe uma marca com este nome' });
            return;
        }
        res.status(500).json({ error: 'Erro ao atualizar marca' });
    }
});
exports.updateBrand = updateBrand;
// DELETE - Remover marca (apenas admin)
const deleteBrand = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        // Verificar se a marca existe
        const existingBrand = yield prisma_1.default.brand.findUnique({
            where: { id }
        });
        if (!existingBrand) {
            res.status(404).json({ error: 'Marca não encontrada' });
            return;
        }
        // Verificar se existem produtos associados à marca
        const productsCount = yield prisma_1.default.product.count({
            where: { brandId: id }
        });
        if (productsCount > 0) {
            res.status(400).json({ error: 'Não é possível excluir uma marca com produtos associados' });
            return;
        }
        // Excluir a marca
        yield prisma_1.default.brand.delete({
            where: { id }
        });
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Erro ao excluir marca:', error);
        res.status(500).json({ error: 'Erro ao excluir marca' });
    }
});
exports.deleteBrand = deleteBrand;
