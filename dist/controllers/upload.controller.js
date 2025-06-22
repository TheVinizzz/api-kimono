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
exports.UploadController = exports.uploadProductImages = exports.uploadImages = exports.uploadImage = exports.uploadMultiple = exports.uploadSingle = void 0;
const minio_service_1 = require("../services/minio.service");
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const minioService = new minio_service_1.MinioService();
// Configuração do multer para armazenar arquivos na memória
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (_req, file, cb) => {
        // Aceitar apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Apenas arquivos de imagem são permitidos'));
        }
    },
});
exports.uploadSingle = upload.single('image');
exports.uploadMultiple = upload.array('images', 10);
const uploadImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const file = req.file;
        const fileName = `${(0, uuid_1.v4)()}-${file.originalname}`;
        const folder = 'uploads';
        const fileUrl = yield minioService.uploadFile(folder, fileName, file.buffer, file.mimetype);
        res.json({
            message: 'Arquivo enviado com sucesso',
            fileUrl,
            fileName,
        });
    }
    catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.uploadImage = uploadImage;
const uploadImages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const files = req.files;
        const uploadPromises = files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            const fileName = `${(0, uuid_1.v4)()}-${file.originalname}`;
            const folder = 'uploads';
            const fileUrl = yield minioService.uploadFile(folder, fileName, file.buffer, file.mimetype);
            return {
                fileName,
                fileUrl,
                originalName: file.originalname,
                size: file.size,
            };
        }));
        const uploadedFiles = yield Promise.all(uploadPromises);
        res.json({
            message: 'Arquivos enviados com sucesso',
            files: uploadedFiles,
        });
    }
    catch (error) {
        console.error('Erro no upload múltiplo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.uploadImages = uploadImages;
const uploadProductImages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const files = req.files;
        const productId = req.body.productId;
        if (!productId) {
            return res.status(400).json({ error: 'ID do produto é obrigatório' });
        }
        const uploadPromises = files.map((file, index) => __awaiter(void 0, void 0, void 0, function* () {
            const fileName = `product-${productId}-${(0, uuid_1.v4)()}-${file.originalname}`;
            const folder = 'products';
            const fileUrl = yield minioService.uploadFile(folder, fileName, file.buffer, file.mimetype);
            return {
                fileName,
                fileUrl,
                originalName: file.originalname,
                size: file.size,
                order: index,
            };
        }));
        const uploadedFiles = yield Promise.all(uploadPromises);
        res.json({
            message: 'Imagens do produto enviadas com sucesso',
            images: uploadedFiles,
        });
    }
    catch (error) {
        console.error('Erro no upload de imagens do produto:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.uploadProductImages = uploadProductImages;
class UploadController {
    // Upload de imagem de produto
    static uploadProductImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
                }
                const file = req.file;
                const fileName = `product-${(0, uuid_1.v4)()}-${file.originalname}`;
                const folder = 'products';
                const fileUrl = yield minioService.uploadFile(folder, fileName, file.buffer, file.mimetype);
                res.json({
                    message: 'Imagem do produto enviada com sucesso',
                    fileUrl,
                    fileName,
                });
            }
            catch (error) {
                console.error('Erro no upload da imagem do produto:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Upload de imagem de categoria
    static uploadCategoryImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
                }
                const file = req.file;
                const fileName = `category-${(0, uuid_1.v4)()}-${file.originalname}`;
                const folder = 'categories';
                const fileUrl = yield minioService.uploadFile(folder, fileName, file.buffer, file.mimetype);
                res.json({
                    message: 'Imagem da categoria enviada com sucesso',
                    fileUrl,
                    fileName,
                });
            }
            catch (error) {
                console.error('Erro no upload da imagem da categoria:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Upload múltiplo de imagens
    static uploadMultipleImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, exports.uploadImages)(req, res);
        });
    }
    // Deletar arquivo
    static deleteFile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { fileName } = req.params;
                if (!fileName) {
                    return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
                }
                yield minioService.deleteFile(fileName);
                res.json({ message: 'Arquivo removido com sucesso' });
            }
            catch (error) {
                console.error('Erro ao remover arquivo:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Listar arquivos
    static listFiles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { folder } = req.query;
                const files = yield minioService.listFiles(folder);
                res.json({ files });
            }
            catch (error) {
                console.error('Erro ao listar arquivos:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
    // Gerar URL de upload pré-assinada
    static generateUploadUrl(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { objectName, contentType, expirySeconds } = req.body;
                if (!objectName) {
                    return res.status(400).json({ error: 'Nome do objeto é obrigatório' });
                }
                const uploadUrl = yield minioService.generateUploadUrl(objectName, expirySeconds || 3600, contentType || 'image/*');
                res.json({
                    uploadUrl,
                    objectName,
                    expiresIn: expirySeconds || 3600,
                });
            }
            catch (error) {
                console.error('Erro ao gerar URL de upload:', error);
                res.status(500).json({ error: 'Erro interno do servidor' });
            }
        });
    }
}
exports.UploadController = UploadController;
