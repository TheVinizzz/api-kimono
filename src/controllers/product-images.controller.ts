import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { MinioService } from '../services/minio.service';
import { v4 as uuidv4 } from 'uuid';
import { MulterFile, MulterRequest as IMulterRequest } from '../types/multer.types';

const minioService = new MinioService();

export const uploadProductImages = async (req: Request & IMulterRequest, res: Response) => {
  try {
    const { productId } = req.params;
    
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const files = req.files as MulterFile[];
    
    // Verificar se o produto existe
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Upload dos arquivos para o MinIO
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
        productId: parseInt(productId),
        imageUrl: fileUrl,
        isMain: index === 0, // Primeira imagem é a principal
        order: index + 1,
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);

    // Salvar no banco de dados
    const savedImages = await Promise.all(
      uploadedImages.map(imageData => 
        prisma.productImage.create({
          data: imageData
        })
      )
    );

    res.json({
      message: 'Imagens enviadas com sucesso',
      images: savedImages,
    });
  } catch (error) {
    console.error('Erro no upload de imagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getProductImages = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const images = await prisma.productImage.findMany({
      where: { productId: parseInt(productId) },
      orderBy: { order: 'asc' }
    });

    res.json(images);
  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const setMainImage = async (req: Request, res: Response) => {
  try {
    const { productId, imageId } = req.params;

    // Remover isMain de todas as imagens do produto
    await prisma.productImage.updateMany({
      where: { productId: parseInt(productId) },
      data: { isMain: false }
    });

    // Definir a nova imagem principal
    const updatedImage = await prisma.productImage.update({
      where: { id: parseInt(imageId) },
      data: { isMain: true }
    });

    res.json({
      message: 'Imagem principal definida com sucesso',
      image: updatedImage
    });
  } catch (error) {
    console.error('Erro ao definir imagem principal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const reorderImages = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { imageIds } = req.body; // Array de IDs na nova ordem

    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ error: 'imageIds deve ser um array' });
    }

    // Atualizar a ordem das imagens
    const updatePromises = imageIds.map((imageId: number, index: number) =>
      prisma.productImage.update({
        where: { id: imageId },
        data: { order: index + 1 }
      })
    );

    await Promise.all(updatePromises);

    const updatedImages = await prisma.productImage.findMany({
      where: { productId: parseInt(productId) },
      orderBy: { order: 'asc' }
    });

    res.json({
      message: 'Ordem das imagens atualizada com sucesso',
      images: updatedImages
    });
  } catch (error) {
    console.error('Erro ao reordenar imagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;

    // Buscar a imagem para obter a URL
    const image = await prisma.productImage.findUnique({
      where: { id: parseInt(imageId) }
    });

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Extrair o nome do arquivo da URL
    const fileName = image.imageUrl.split('/').pop();
    if (fileName) {
      // Remover do MinIO
      await minioService.deleteFile(`products/${fileName}`);
    }

    // Remover do banco de dados
    await prisma.productImage.delete({
      where: { id: parseInt(imageId) }
    });

    res.json({ message: 'Imagem removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Classe para compatibilidade com rotas existentes
export class ProductImagesController {
  static uploadProductImages = uploadProductImages;
  static getProductImages = getProductImages;
  static setMainImage = setMainImage;
  static reorderImages = reorderImages;
  static deleteImage = deleteImage;

  static async fixMultipleMainImages(req: Request, res: Response) {
    try {
      const { productId } = req.params;

      // Buscar todas as imagens do produto
      const images = await prisma.productImage.findMany({
        where: { productId: parseInt(productId) },
        orderBy: { order: 'asc' }
      });

      if (images.length === 0) {
        return res.status(404).json({ error: 'Nenhuma imagem encontrada para este produto' });
      }

      // Remover isMain de todas as imagens
      await prisma.productImage.updateMany({
        where: { productId: parseInt(productId) },
        data: { isMain: false }
      });

      // Definir a primeira imagem como principal
      await prisma.productImage.update({
        where: { id: images[0].id },
        data: { isMain: true }
      });

      res.json({
        message: 'Imagens principais corrigidas com sucesso',
        mainImageId: images[0].id
      });
    } catch (error) {
      console.error('Erro ao corrigir imagens principais:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
} 