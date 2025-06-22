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
exports.MinioService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
class MinioService {
    constructor() {
        this.bucketName = process.env.MINIO_BUCKET || 'shopping-images';
        this.s3Client = new client_s3_1.S3Client({
            endpoint: process.env.MINIO_URL,
            credentials: {
                accessKeyId: process.env.MINIO_PUBLIC_KEY || '',
                secretAccessKey: process.env.MINIO_SECRET_KEY || '',
            },
            region: 'us-east-1', // MinIO requer uma região
            forcePathStyle: true, // necessário para MinIO
        });
    }
    getPublicUrl(objectName) {
        if (!objectName || objectName === 'undefined') {
            return '';
        }
        // Usar MINIO_PUBLIC_URL se disponível, ou MINIO_URL
        let baseUrl = process.env.MINIO_PUBLIC_URL || process.env.MINIO_URL;
        // Sempre forçar HTTPS - remover qualquer protocolo existente e adicionar HTTPS
        if (baseUrl) {
            // Remover protocolo existente se houver
            baseUrl = baseUrl.replace(/^https?:\/\//, '');
            // Sempre usar HTTPS
            baseUrl = `https://${baseUrl}`;
        }
        // Se não temos URL base, usar URL padrão com HTTPS
        if (!baseUrl) {
            baseUrl = 'https://shop-shop.9kbfkm.easypanel.host';
        }
        const publicUrl = `${baseUrl}/${this.bucketName}/${objectName}`;
        console.log('URL pública gerada para objeto (SEMPRE HTTPS):', publicUrl);
        return publicUrl;
    }
    uploadFile(folder, fileName, file, contentType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const key = `${folder}/${fileName}`;
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file,
                    ContentType: contentType,
                });
                yield this.s3Client.send(command);
                console.log(`Arquivo ${fileName} enviado com sucesso para a pasta ${folder} no bucket ${this.bucketName}`);
                // Construir URL sempre com HTTPS
                let baseUrl = process.env.MINIO_PUBLIC_URL || process.env.MINIO_URL;
                if (baseUrl) {
                    // Remover protocolo existente se houver
                    baseUrl = baseUrl.replace(/^https?:\/\//, '');
                    // Sempre usar HTTPS
                    baseUrl = `https://${baseUrl}`;
                }
                else {
                    baseUrl = 'https://shop-shop.9kbfkm.easypanel.host';
                }
                const fileUrl = `${baseUrl}/${this.bucketName}/${key}`;
                console.log('Upload fileUrl (SEMPRE HTTPS):', fileUrl);
                return fileUrl;
            }
            catch (error) {
                console.error(`Erro ao enviar arquivo ${fileName} para a pasta ${folder}`, error instanceof Error ? error.stack : 'Sem stack trace');
                throw error;
            }
        });
    }
    downloadFile(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: fileName,
                });
                const response = yield this.s3Client.send(command);
                if (!response.Body) {
                    throw new Error('Arquivo não encontrado ou vazio');
                }
                // Converter stream para buffer usando método correto
                const stream = response.Body;
                const chunks = [];
                return new Promise((resolve, reject) => {
                    stream.on('data', (chunk) => chunks.push(chunk));
                    stream.on('error', reject);
                    stream.on('end', () => resolve(Buffer.concat(chunks)));
                });
            }
            catch (error) {
                console.error(`Erro ao baixar arquivo ${fileName}`, (error === null || error === void 0 ? void 0 : error.stack) || 'Sem stack trace');
                throw error;
            }
        });
    }
    deleteFile(fileName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const command = new client_s3_1.DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: fileName,
                });
                yield this.s3Client.send(command);
                console.log(`Arquivo ${fileName} removido com sucesso do bucket ${this.bucketName}`);
            }
            catch (error) {
                console.error(`Erro ao remover arquivo ${fileName}`, (error === null || error === void 0 ? void 0 : error.stack) || 'Sem stack trace');
                throw error;
            }
        });
    }
    generateUploadUrl(objectName_1) {
        return __awaiter(this, arguments, void 0, function* (objectName, expirySeconds = 3600, contentType = 'image/*') {
            try {
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: objectName,
                    ContentType: contentType,
                });
                return yield (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
                    expiresIn: expirySeconds
                });
            }
            catch (error) {
                console.error(`Erro ao gerar URL de upload: ${(error === null || error === void 0 ? void 0 : error.message) || 'Erro desconhecido'}`, (error === null || error === void 0 ? void 0 : error.stack) || 'Sem stack trace');
                throw error;
            }
        });
    }
    listFiles(folder) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: this.bucketName,
                    Prefix: folder ? `${folder}/` : undefined,
                });
                const result = yield this.s3Client.send(command);
                return ((_a = result.Contents) === null || _a === void 0 ? void 0 : _a.map((obj) => obj.Key || '')) || [];
            }
            catch (error) {
                console.error(`Erro ao listar arquivos${folder ? ` da pasta ${folder}` : ''}`, (error === null || error === void 0 ? void 0 : error.stack) || 'Sem stack trace');
                throw error;
            }
        });
    }
}
exports.MinioService = MinioService;
