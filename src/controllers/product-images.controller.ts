import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MinioService } from '../services/minio.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const prisma = new PrismaClient();
const minioService = new MinioService();

export class ProductImagesController {
  // Upload múltiplas imagens para um produto
  static async uploadProductImages(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
      }

      const productIdNum = Number(productId);
      if (isNaN(productIdNum)) {
        return res.status(400).json({ error: 'ID do produto inválido' });
      }

      // Verificar se o produto existe
      const product = await prisma.product.findUnique({
        where: { id: productIdNum }
      });

      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const uploadResults = [];
      let isFirst = true;

      // Obter a próxima ordem disponível
      const lastImage = await prisma.productImage.findFirst({
        where: { productId: productIdNum },
        orderBy: { order: 'desc' }
      });
      let nextOrder = lastImage ? lastImage.order + 1 : 0;

      for (const file of files) {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const fileName = `products/${productIdNum}/${uuidv4()}${fileExtension}`;

        // Upload para MinIO
        const fileUrl = await minioService.uploadFile(
          'products',
          `${productIdNum}/${uuidv4()}${fileExtension}`,
          file.buffer,
          file.mimetype
        );

        // Verificar se já existe uma imagem principal para este produto
        const existingMainImage = await prisma.productImage.findFirst({
          where: { 
            productId: productIdNum,
            isMain: true 
          }
        });

        const shouldBeMain = !existingMainImage; // Apenas se não houver imagem principal

        console.log('Upload - Produto:', productIdNum, 'Arquivo:', file.originalname, 'Será principal:', shouldBeMain);

        // Criar registro na base de dados
        const productImage = await prisma.productImage.create({
          data: {
            productId: productIdNum,
            imageUrl: fileUrl,
            isMain: shouldBeMain,
            order: nextOrder++
          }
        });

        // Se é a primeira imagem principal, atualizar também o campo imageUrl do produto para compatibilidade
        if (shouldBeMain) {
          await prisma.product.update({
            where: { id: productIdNum },
            data: { imageUrl: fileUrl }
          });
        }

        uploadResults.push({
          id: productImage.id,
          imageUrl: fileUrl,
          isMain: productImage.isMain,
          order: productImage.order,
          originalName: file.originalname,
          size: file.size
        });
      }

      res.json({
        success: true,
        images: uploadResults,
        message: `${uploadResults.length} imagem(ns) enviada(s) com sucesso`
      });
    } catch (error) {
      console.error('Erro no upload de imagens do produto:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor ao fazer upload das imagens' 
      });
    }
  }

  // Obter todas as imagens de um produto
  static async getProductImages(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const productIdNum = Number(productId);

      if (isNaN(productIdNum)) {
        return res.status(400).json({ error: 'ID do produto inválido' });
      }

      const images = await prisma.productImage.findMany({
        where: { productId: productIdNum },
        orderBy: [
          { isMain: 'desc' }, // Imagem principal primeiro
          { order: 'asc' }    // Depois por ordem
        ]
      });

      res.json(images);
    } catch (error) {
      console.error('Erro ao buscar imagens do produto:', error);
      res.status(500).json({ error: 'Erro ao buscar imagens do produto' });
    }
  }

  // Definir imagem principal
  static async setMainImage(req: Request, res: Response) {
    try {
      const { productId, imageId } = req.params;
      const productIdNum = Number(productId);
      const imageIdNum = Number(imageId);

      console.log('SetMainImage - IDs recebidos:', { productId: productIdNum, imageId: imageIdNum });

      if (isNaN(productIdNum) || isNaN(imageIdNum)) {
        return res.status(400).json({ error: 'IDs inválidos' });
      }

      // Verificar se a imagem pertence ao produto
      const image = await prisma.productImage.findFirst({
        where: { 
          id: imageIdNum,
          productId: productIdNum 
        }
      });

      if (!image) {
        console.log('Imagem não encontrada:', { imageIdNum, productIdNum });
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }

      console.log('Imagem encontrada:', image);

      // Usar uma transação para garantir consistência
      const result = await prisma.$transaction(async (tx) => {
        // Primeiro, remover isMain de todas as imagens do produto
        const updateResult = await tx.productImage.updateMany({
          where: { 
            productId: productIdNum
          },
          data: { isMain: false }
        });

        console.log('Removeu isMain de', updateResult.count, 'imagens');

        // Depois, definir esta imagem como principal
        const updatedImage = await tx.productImage.update({
          where: { id: imageIdNum },
          data: { isMain: true }
        });

        console.log('Imagem definida como principal:', updatedImage);

        // Atualizar também o campo imageUrl do produto para compatibilidade
        await tx.product.update({
          where: { id: productIdNum },
          data: { imageUrl: updatedImage.imageUrl }
        });

        return updatedImage;
      });

      // Verificar o estado final
      const allImages = await prisma.productImage.findMany({
        where: { productId: productIdNum },
        select: { id: true, isMain: true }
      });

      console.log('Estado final das imagens:', allImages);

      res.json({
        success: true,
        message: 'Imagem principal definida com sucesso',
        image: result
      });
    } catch (error) {
      console.error('Erro ao definir imagem principal:', error);
      res.status(500).json({ error: 'Erro ao definir imagem principal' });
    }
  }

  // Reordenar imagens
  static async reorderImages(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { imageIds } = req.body; // Array de IDs na nova ordem
      
      const productIdNum = Number(productId);
      if (isNaN(productIdNum)) {
        return res.status(400).json({ error: 'ID do produto inválido' });
      }

      if (!Array.isArray(imageIds)) {
        return res.status(400).json({ error: 'Lista de IDs inválida' });
      }

      // Atualizar ordem das imagens
      const updatePromises = imageIds.map((imageId: number, index: number) =>
        prisma.productImage.update({
          where: { 
            id: imageId,
            productId: productIdNum // Garante que a imagem pertence ao produto
          },
          data: { order: index }
        })
      );

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'Ordem das imagens atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao reordenar imagens:', error);
      res.status(500).json({ error: 'Erro ao reordenar imagens' });
    }
  }

  // Deletar imagem
  static async deleteImage(req: Request, res: Response) {
    try {
      const { productId, imageId } = req.params;
      const productIdNum = Number(productId);
      const imageIdNum = Number(imageId);

      if (isNaN(productIdNum) || isNaN(imageIdNum)) {
        return res.status(400).json({ error: 'IDs inválidos' });
      }

      // Buscar a imagem
      const image = await prisma.productImage.findFirst({
        where: { 
          id: imageIdNum,
          productId: productIdNum 
        }
      });

      if (!image) {
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }

      // Tentar deletar do MinIO (não falha se não conseguir)
      try {
        // Extrair o nome do arquivo da URL
        const fileName = image.imageUrl.split('/').pop();
        if (fileName) {
          await minioService.deleteFile(fileName);
        }
      } catch (minioError) {
        console.warn('Erro ao deletar arquivo do MinIO:', minioError);
      }

      // Deletar da base de dados
      await prisma.productImage.delete({
        where: { id: imageIdNum }
      });

      // Se era a imagem principal, definir uma nova imagem principal
      if (image.isMain) {
        const nextImage = await prisma.productImage.findFirst({
          where: { productId: productIdNum },
          orderBy: { order: 'asc' }
        });

        if (nextImage) {
          await prisma.productImage.update({
            where: { id: nextImage.id },
            data: { isMain: true }
          });

          // Atualizar imageUrl do produto
          await prisma.product.update({
            where: { id: productIdNum },
            data: { imageUrl: nextImage.imageUrl }
          });
        } else {
          // Não há mais imagens, limpar imageUrl do produto
          await prisma.product.update({
            where: { id: productIdNum },
            data: { imageUrl: null }
          });
        }
      }

      res.json({
        success: true,
        message: 'Imagem deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      res.status(500).json({ error: 'Erro ao deletar imagem' });
    }
  }

  // Corrigir múltiplas imagens principais (função de limpeza)
  static async fixMultipleMainImages(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const productIdNum = Number(productId);

      if (isNaN(productIdNum)) {
        return res.status(400).json({ error: 'ID do produto inválido' });
      }

      console.log('Corrigindo múltiplas imagens principais para produto:', productIdNum);

      // Buscar todas as imagens principais do produto
      const mainImages = await prisma.productImage.findMany({
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
      const result = await prisma.$transaction(async (tx) => {
        // Remover isMain de todas as imagens
        await tx.productImage.updateMany({
          where: { productId: productIdNum },
          data: { isMain: false }
        });

        // Definir apenas a primeira como principal
        const firstImage = mainImages[0];
        await tx.productImage.update({
          where: { id: firstImage.id },
          data: { isMain: true }
        });

        // Atualizar imageUrl do produto
        await tx.product.update({
          where: { id: productIdNum },
          data: { imageUrl: firstImage.imageUrl }
        });

        return firstImage;
      });

      console.log('Correção aplicada, imagem principal:', result.id);

      res.json({
        success: true,
        message: `Corrigido ${mainImages.length} imagens principais, mantida apenas a primeira`,
        corrected: true,
        mainImage: result
      });
    } catch (error) {
      console.error('Erro ao corrigir múltiplas imagens principais:', error);
      res.status(500).json({ error: 'Erro ao corrigir múltiplas imagens principais' });
    }
  }
} 