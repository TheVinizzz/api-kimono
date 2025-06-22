"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const AWS = __importStar(require("aws-sdk"));
class MinioService {
    constructor() {
        this.bucketName = process.env.MINIO_BUCKET || 'shopping-images';
        this.s3 = new AWS.S3({
            endpoint: process.env.MINIO_URL,
            accessKeyId: process.env.MINIO_PUBLIC_KEY,
            secretAccessKey: process.env.MINIO_SECRET_KEY,
            s3ForcePathStyle: true, // necessário para MinIO
            signatureVersion: 'v4',
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
                const params = {
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file,
                };
                if (contentType) {
                    params.ContentType = contentType;
                }
                yield this.s3.putObject(params).promise();
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
                const data = yield this.s3
                    .getObject({
                    Bucket: this.bucketName,
                    Key: fileName,
                })
                    .promise();
                return data.Body;
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
                yield this.s3
                    .deleteObject({
                    Bucket: this.bucketName,
                    Key: fileName,
                })
                    .promise();
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
                const params = {
                    Bucket: this.bucketName,
                    Key: objectName,
                    Expires: expirySeconds,
                    ContentType: contentType,
                };
                return yield this.s3.getSignedUrlPromise('putObject', params);
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
                const params = {
                    Bucket: this.bucketName,
                    Prefix: folder ? `${folder}/` : undefined,
                };
                const result = yield this.s3.listObjectsV2(params).promise();
                return ((_a = result.Contents) === null || _a === void 0 ? void 0 : _a.map(obj => obj.Key || '')) || [];
            }
            catch (error) {
                console.error(`Erro ao listar arquivos${folder ? ` da pasta ${folder}` : ''}`, (error === null || error === void 0 ? void 0 : error.stack) || 'Sem stack trace');
                throw error;
            }
        });
    }
}
exports.MinioService = MinioService;
