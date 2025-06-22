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
exports.ProductImagesController = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const minio_service_1 = require("../services/minio.service");
const uuid_1 = require("uuid");
const minioService = new minio_service_1.MinioService();
class ProductImagesController {
    // Upload múltiplas imagens para um produto
    static uploadProductImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
                }
                const files = req.files;
                // Verificar se o produto existe
                const product = yield prisma_1.default.product.findUnique({
                    where: { id: parseInt(productId) }
                });
                if (!product) {
                    return res.status(404).json({ error: 'Produto não encontrado' });
                }
                // Upload dos arquivos para o MinIO
                const uploadPromises = files.map((file, index) => __awaiter(this, void 0, void 0, function* () {
                    const fileName = `product-${productId}-${(0, uuid_1.v4)()}-${file.originalname}`;
                    const folder = 'products';
                    const fileUrl = yield minioService.uploadFile(folder, fileName, file.buffer, file.mimetype);
                    return {
                        productId: parseInt(productId),
                        imageUrl: fileUrl,
                        isMain: index === 0, // Primeira imagem é a principal
                        order: index + 1,
                    };
                }));
                const uploadedImages = yield Promise.all(uploadPromises);
                // Salvar no banco de dados
                const savedImages = yield Promise.all(uploadedImages.map(imageData => prisma_1.default.productImage.create({
                    data: imageData
                })));
                res.json({
                    message: 'Imagens enviadas com sucesso',
                    images: savedImages,
                });
            }
            catch (error) {
                console.error('Erro no upload de imagens:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Obter todas as imagens de um produto
    static getProductImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const images = yield prisma_1.default.productImage.findMany({
                    where: { productId: parseInt(productId) },
                    orderBy: { order: 'asc' }
                });
                res.json(images);
            }
            catch (error) {
                console.error('Erro ao buscar imagens:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Definir imagem principal
    static setMainImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, imageId } = req.params;
                // Remover isMain de todas as imagens do produto
                yield prisma_1.default.productImage.updateMany({
                    where: { productId: parseInt(productId) },
                    data: { isMain: false }
                });
                // Definir a nova imagem principal
                const updatedImage = yield prisma_1.default.productImage.update({
                    where: { id: parseInt(imageId) },
                    data: { isMain: true }
                });
                res.json({
                    message: 'Imagem principal definida com sucesso',
                    image: updatedImage
                });
            }
            catch (error) {
                console.error('Erro ao definir imagem principal:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Reordenar imagens
    static reorderImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const { imageIds } = req.body; // Array de IDs na nova ordem
                if (!Array.isArray(imageIds)) {
                    return res.status(400).json({ error: 'imageIds deve ser um array' });
                }
                // Atualizar a ordem das imagens
                const updatePromises = imageIds.map((imageId, index) => prisma_1.default.productImage.update({
                    where: { id: imageId },
                    data: { order: index + 1 }
                }));
                yield Promise.all(updatePromises);
                const updatedImages = yield prisma_1.default.productImage.findMany({
                    where: { productId: parseInt(productId) },
                    orderBy: { order: 'asc' }
                });
                res.json({
                    message: 'Ordem das imagens atualizada com sucesso',
                    images: updatedImages
                });
            }
            catch (error) {
                console.error('Erro ao reordenar imagens:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Deletar imagem
    static deleteImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { imageId } = req.params;
                // Buscar a imagem para obter a URL
                const image = yield prisma_1.default.productImage.findUnique({
                    where: { id: parseInt(imageId) }
                });
                if (!image) {
                    return res.status(404).json({ error: 'Imagem não encontrada' });
                }
                // Extrair o nome do arquivo da URL
                const fileName = image.imageUrl.split('/').pop();
                if (fileName) {
                    // Remover do MinIO
                    yield minioService.deleteFile(`products/${fileName}`);
                }
                // Remover do banco de dados
                yield prisma_1.default.productImage.delete({
                    where: { id: parseInt(imageId) }
                });
                res.json({ message: 'Imagem removida com sucesso' });
            }
            catch (error) {
                console.error('Erro ao remover imagem:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Corrigir múltiplas imagens principais (função de limpeza)
    static fixMultipleMainImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const productIdNum = Number(productId);
                if (isNaN(productIdNum)) {
                    return res.status(400).json({ error: 'ID do produto inválido' });
                }
                console.log('Corrigindo múltiplas imagens principais para produto:', productIdNum);
                // Buscar todas as imagens principais do produto
                const mainImages = yield prisma_1.default.productImage.findMany({
                    where: {
                        productId: productIdNum,
                        isMain: true
                    },
                    orderBy: { createdAt: 'asc' }
                });
                console.log('Imagens principais encontradas:', mainImages.length);
                if (mainImages.length <= 1) {
                    return res.json({
                        success: true,
                        message: 'Nenhuma correção necessária',
                        corrected: false
                    });
                }
                // Usar transação para corrigir
                const result = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    // Remover isMain de todas as imagens
                    yield tx.productImage.updateMany({
                        where: { productId: productIdNum },
                        data: { isMain: false }
                    });
                    // Definir apenas a primeira como principal
                    const firstImage = mainImages[0];
                    yield tx.productImage.update({
                        where: { id: firstImage.id },
                        data: { isMain: true }
                    });
                    // Atualizar imageUrl do produto
                    yield tx.product.update({
                        where: { id: productIdNum },
                        data: { imageUrl: firstImage.imageUrl }
                    });
                    return firstImage;
                }));
                console.log('Correção aplicada, imagem principal:', result.id);
                res.json({
                    success: true,
                    message: `Corrigido ${mainImages.length} imagens principais, mantida apenas a primeira`,
                    corrected: true,
                    mainImage: result
                });
            }
            catch (error) {
                console.error('Erro ao corrigir múltiplas imagens principais:', error);
                res.status(500).json({ error: 'Erro ao corrigir múltiplas imagens principais' });
            }
        });
    }
}
exports.ProductImagesController = ProductImagesController;
