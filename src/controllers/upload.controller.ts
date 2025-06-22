import { Request, Response } from 'express';
import { MinioService } from '../services/minio.service';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { MulterFile, MulterRequest as IMulterRequest } from '../types/multer.types';

// Extender a interface Request para incluir file e files do multer
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

const minioService = new MinioService();

// Configuração do multer para armazenar arquivos na memória
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  },
});

export const uploadSingle = upload.single('image');
export const uploadMultiple = upload.array('images', 10);

export const uploadImage = async (req: Request & IMulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const file = req.file as MulterFile;
    const fileName = `${uuidv4()}-${file.originalname}`;
    const folder = 'uploads';

    const fileUrl = await minioService.uploadFile(
      folder,
      fileName,
      file.buffer,
      file.mimetype
    );

    res.json({
      message: 'Arquivo enviado com sucesso',
      fileUrl,
      fileName,
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const uploadImages = async (req: Request & IMulterRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const files = req.files as MulterFile[];
    const uploadPromises = files.map(async (file: MulterFile) => {
      const fileName = `${uuidv4()}-${file.originalname}`;
      const folder = 'uploads';

      const fileUrl = await minioService.uploadFile(
        folder,
        fileName,
        file.buffer,
        file.mimetype
      );

      return {
        fileName,
        fileUrl,
        originalName: file.originalname,
        size: file.size,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.json({
      message: 'Arquivos enviados com sucesso',
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Erro no upload múltiplo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const uploadProductImages = async (req: Request & IMulterRequest, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const files = req.files as MulterFile[];
    const productId = req.body.productId;

    if (!productId) {
      return res.status(400).json({ error: 'ID do produto é obrigatório' });
    }

    const uploadPromises = files.map(async (file: MulterFile, index: number) => {
      const fileName = `product-${productId}-${uuidv4()}-${file.originalname}`;
      const folder = 'products';

      const fileUrl = await minioService.uploadFile(
        folder,
        fileName,
        file.buffer,
        file.mimetype
      );

      return {
        fileName,
        fileUrl,
        originalName: file.originalname,
        size: file.size,
        order: index,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.json({
      message: 'Imagens do produto enviadas com sucesso',
      images: uploadedFiles,
    });
  } catch (error) {
    console.error('Erro no upload de imagens do produto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export class UploadController {
  
  // Upload de imagem de produto
  static async uploadProductImage(req: Request & IMulterRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const file = req.file as MulterFile;
      const fileName = `product-${uuidv4()}-${file.originalname}`;
      const folder = 'products';

      const fileUrl = await minioService.uploadFile(
        folder,
        fileName,
        file.buffer,
        file.mimetype
      );

      res.json({
        message: 'Imagem do produto enviada com sucesso',
        fileUrl,
        fileName,
      });
    } catch (error) {
      console.error('Erro no upload da imagem do produto:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Upload de imagem de categoria
  static async uploadCategoryImage(req: Request & IMulterRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const file = req.file as MulterFile;
      const fileName = `category-${uuidv4()}-${file.originalname}`;
      const folder = 'categories';

      const fileUrl = await minioService.uploadFile(
        folder,
        fileName,
        file.buffer,
        file.mimetype
      );

      res.json({
        message: 'Imagem da categoria enviada com sucesso',
        fileUrl,
        fileName,
      });
    } catch (error) {
      console.error('Erro no upload da imagem da categoria:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Upload múltiplo de imagens
  static async uploadMultipleImages(req: Request & IMulterRequest, res: Response) {
    return uploadImages(req, res);
  }

  // Deletar arquivo
  static async deleteFile(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      
      if (!fileName) {
        return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
      }

      await minioService.deleteFile(fileName);

      res.json({ message: 'Arquivo removido com sucesso' });
    } catch (error) {
      console.error('Erro ao remover arquivo:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Listar arquivos
  static async listFiles(req: Request, res: Response) {
    try {
      const { folder } = req.query;
      
      const files = await minioService.listFiles(folder as string);

      res.json({ files });
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Gerar URL de upload pré-assinada
  static async generateUploadUrl(req: Request, res: Response) {
    try {
      const { objectName, contentType, expirySeconds } = req.body;
      
      if (!objectName) {
        return res.status(400).json({ error: 'Nome do objeto é obrigatório' });
      }

      const uploadUrl = await minioService.generateUploadUrl(
        objectName,
        expirySeconds || 3600,
        contentType || 'image/*'
      );

      res.json({
        uploadUrl,
        objectName,
        expiresIn: expirySeconds || 3600,
      });
    } catch (error) {
      console.error('Erro ao gerar URL de upload:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
} 