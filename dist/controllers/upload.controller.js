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
exports.UploadController = exports.uploadMiddleware = void 0;
const minio_service_1 = require("../services/minio.service");
const uuid_1 = require("uuid");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const minioService = new minio_service_1.MinioService();
// Configuração do multer para armazenar arquivos em memória
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        // Permitir apenas imagens
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Apenas arquivos de imagem são permitidos'));
        }
    },
});
exports.uploadMiddleware = upload;
class UploadController {
    // Upload de imagem de produto
    static uploadProductImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
                }
                const fileExtension = path_1.default.extname(req.file.originalname).toLowerCase();
                const fileName = `${(0, uuid_1.v4)()}${fileExtension}`;
                const folder = 'products';
                const fileUrl = yield minioService.uploadFile(folder, fileName, req.file.buffer, req.file.mimetype);
                res.json({
                    success: true,
                    fileUrl,
                    fileName,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    mimetype: req.file.mimetype
                });
            }
            catch (error) {
                console.error('Erro no upload de imagem do produto:', error);
                res.status(500).json({
                    error: 'Erro interno do servidor ao fazer upload da imagem'
                });
            }
        });
    }
    // Upload de imagem de categoria
    static uploadCategoryImage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
                }
                const fileExtension = path_1.default.extname(req.file.originalname).toLowerCase();
                const fileName = `${(0, uuid_1.v4)()}${fileExtension}`;
                const folder = 'categories';
                const fileUrl = yield minioService.uploadFile(folder, fileName, req.file.buffer, req.file.mimetype);
                res.json({
                    success: true,
                    fileUrl,
                    fileName,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    mimetype: req.file.mimetype
                });
            }
            catch (error) {
                console.error('Erro no upload de imagem da categoria:', error);
                res.status(500).json({
                    error: 'Erro interno do servidor ao fazer upload da imagem'
                });
            }
        });
    }
    // Upload múltiplo de imagens
    static uploadMultipleImages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const files = req.files;
                if (!files || files.length === 0) {
                    return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
                }
                const folder = req.body.folder || 'misc';
                const uploadResults = [];
                for (const file of files) {
                    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
                    const fileName = `${(0, uuid_1.v4)()}${fileExtension}`;
                    const fileUrl = yield minioService.uploadFile(folder, fileName, file.buffer, file.mimetype);
                    uploadResults.push({
                        fileUrl,
                        fileName,
                        originalName: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype
                    });
                }
                res.json({
                    success: true,
                    files: uploadResults
                });
            }
            catch (error) {
                console.error('Erro no upload múltiplo de imagens:', error);
                res.status(500).json({
                    error: 'Erro interno do servidor ao fazer upload das imagens'
                });
            }
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
                res.json({
                    success: true,
                    message: 'Arquivo deletado com sucesso'
                });
            }
            catch (error) {
                console.error('Erro ao deletar arquivo:', error);
                res.status(500).json({
                    error: 'Erro interno do servidor ao deletar arquivo'
                });
            }
        });
    }
    // Listar arquivos
    static listFiles(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { folder } = req.query;
                const files = yield minioService.listFiles(folder);
                res.json({
                    success: true,
                    files: files.map(fileName => ({
                        fileName,
                        url: minioService.getPublicUrl(fileName)
                    }))
                });
            }
            catch (error) {
                console.error('Erro ao listar arquivos:', error);
                res.status(500).json({
                    error: 'Erro interno do servidor ao listar arquivos'
                });
            }
        });
    }
    // Gerar URL de upload pré-assinada
    static generateUploadUrl(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { fileName, contentType } = req.body;
                if (!fileName) {
                    return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
                }
                const uploadUrl = yield minioService.generateUploadUrl(fileName, 3600, // 1 hora
                contentType || 'image/*');
                res.json({
                    success: true,
                    uploadUrl,
                    publicUrl: minioService.getPublicUrl(fileName)
                });
            }
            catch (error) {
                console.error('Erro ao gerar URL de upload:', error);
                res.status(500).json({
                    error: 'Erro interno do servidor ao gerar URL de upload'
                });
            }
        });
    }
}
exports.UploadController = UploadController;
