import { Request, Response } from 'express';
import { MinioService } from '../services/minio.service';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';

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

// Configuração do multer para armazenar arquivos em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Permitir apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  },
});

export const uploadMiddleware = upload;

export class UploadController {
  
  // Upload de imagem de produto
  static async uploadProductImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      }

      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${uuidv4()}${fileExtension}`;
      const folder = 'products';

      const fileUrl = await minioService.uploadFile(
        folder,
        fileName,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({
        success: true,
        fileUrl,
        fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Erro no upload de imagem do produto:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao fazer upload da imagem' 
      });
    }
  }

  // Upload de imagem de categoria
  static async uploadCategoryImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      }

      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${uuidv4()}${fileExtension}`;
      const folder = 'categories';

      const fileUrl = await minioService.uploadFile(
        folder,
        fileName,
        req.file.buffer,
        req.file.mimetype
      );

      res.json({
        success: true,
        fileUrl,
        fileName,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Erro no upload de imagem da categoria:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao fazer upload da imagem' 
      });
    }
  }

  // Upload múltiplo de imagens
  static async uploadMultipleImages(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
      }

      const folder = req.body.folder || 'misc';
      const uploadResults = [];

      for (const file of files) {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const fileName = `${uuidv4()}${fileExtension}`;

        const fileUrl = await minioService.uploadFile(
          folder,
          fileName,
          file.buffer,
          file.mimetype
        );

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
    } catch (error) {
      console.error('Erro no upload múltiplo de imagens:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao fazer upload das imagens' 
      });
    }
  }

  // Deletar arquivo
  static async deleteFile(req: Request, res: Response) {
    try {
      const { fileName } = req.params;
      
      if (!fileName) {
        return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
      }

      await minioService.deleteFile(fileName);

      res.json({
        success: true,
        message: 'Arquivo deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao deletar arquivo' 
      });
    }
  }

  // Listar arquivos
  static async listFiles(req: Request, res: Response) {
    try {
      const { folder } = req.query;
      
      const files = await minioService.listFiles(folder as string);

      res.json({
        success: true,
        files: files.map(fileName => ({
          fileName,
          url: minioService.getPublicUrl(fileName)
        }))
      });
    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao listar arquivos' 
      });
    }
  }

  // Gerar URL de upload pré-assinada
  static async generateUploadUrl(req: Request, res: Response) {
    try {
      const { fileName, contentType } = req.body;
      
      if (!fileName) {
        return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
      }

      const uploadUrl = await minioService.generateUploadUrl(
        fileName,
        3600, // 1 hora
        contentType || 'image/*'
      );

      res.json({
        success: true,
        uploadUrl,
        publicUrl: minioService.getPublicUrl(fileName)
      });
    } catch (error) {
      console.error('Erro ao gerar URL de upload:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao gerar URL de upload' 
      });
    }
  }
} 