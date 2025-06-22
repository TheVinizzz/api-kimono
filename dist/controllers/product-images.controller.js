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
exports.ProductImagesController = exports.deleteImage = exports.reorderImages = exports.setMainImage = exports.getProductImages = exports.uploadProductImages = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const minio_service_1 = require("../services/minio.service");
const uuid_1 = require("uuid");
const minioService = new minio_service_1.MinioService();
const uploadProductImages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const uploadPromises = files.map((file, index) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.uploadProductImages = uploadProductImages;
const getProductImages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.getProductImages = getProductImages;
const setMainImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.setMainImage = setMainImage;
const reorderImages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.reorderImages = reorderImages;
const deleteImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
exports.deleteImage = deleteImage;
// Classe para compatibilidade com rotas existentes
class ProductImagesController {
    static fixMultipleMainImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                // Buscar todas as imagens do produto
                const images = yield prisma_1.default.productImage.findMany({
                    where: { productId: parseInt(productId) },
                    orderBy: { order: 'asc' }
                });
                if (images.length === 0) {
                    return res.status(404).json({ error: 'Nenhuma imagem encontrada para este produto' });
                }
                // Remover isMain de todas as imagens
                yield prisma_1.default.productImage.updateMany({
                    where: { productId: parseInt(productId) },
                    data: { isMain: false }
                });
                // Definir a primeira imagem como principal
                yield prisma_1.default.productImage.update({
                    where: { id: images[0].id },
                    data: { isMain: true }
                });
                res.json({
                    message: 'Imagens principais corrigidas com sucesso',
                    mainImageId: images[0].id
                });
            }
            catch (error) {
                console.error('Erro ao corrigir imagens principais:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
}
exports.ProductImagesController = ProductImagesController;
ProductImagesController.uploadProductImages = exports.uploadProductImages;
ProductImagesController.getProductImages = exports.getProductImages;
ProductImagesController.setMainImage = exports.setMainImage;
ProductImagesController.reorderImages = exports.reorderImages;
ProductImagesController.deleteImage = exports.deleteImage;
