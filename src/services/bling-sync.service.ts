import { PrismaClient } from '@prisma/client';
import blingOAuthService from './bling-oauth.service';
import { MinioService } from './minio.service';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const prisma = new PrismaClient();
const minioService = new MinioService();

interface BlingProduct {
  id: number; // Mantém como number pois vem da API do Bling como number
  nome: string;
  codigo: string;
  preco: number;
  situacao: string;
  categoria?: {
    id: number;
    descricao: string;
  };
  estoques?: Array<{
    saldoFisico: number;
    saldoVirtual: number;
  }>;
  imagemURL?: string;
  descricao?: string;
  dataCriacao?: string;
  dataAlteracao?: string;
  variacao?: Array<{
    id: number;
    nome: string;
    preco: number;
    estoque: number;
    codigo: string;
  }>;
  // Estrutura completa de mídia do Bling
  midia?: Array<{
    id?: number;
    url: string;
    type: number; // 1 = imagem, 2 = vídeo, etc.
    descricao?: string;
    ordem?: number;
  }>;
  // Possível estrutura alternativa
  anexos?: Array<{
    id?: number;
    url: string;
    tipo: string;
    nome?: string;
  }>;
  // Informações adicionais que podem conter imagens
  informacoesAdicionais?: {
    imagens?: Array<{
      url: string;
      principal?: boolean;
      ordem?: number;
    }>;
  };
}

interface SyncResult {
  success: boolean;
  message: string;
  stats: {
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  details: Array<{
      blingId: number;
      name: string;
    status: 'success' | 'failed' | 'skipped';
      error?: string;
    imagesProcessed?: number;
  }>;
}

interface ImageDownloadResult {
  success: boolean;
  imageUrl?: string;
  fileName?: string;
  error?: string;
}

export class BlingSyncService {
  
  // ==========================================
  // MÉTODO PRINCIPAL DE SINCRONIZAÇÃO
  // ==========================================
  
  async syncAll(options: {
    syncProducts?: boolean;
    syncCategories?: boolean;
    syncStock?: boolean;
    dryRun?: boolean;
    limit?: number;
  } = {}): Promise<SyncResult> {
    const {
      syncProducts = true,
      syncCategories = true,
      syncStock = true,
      dryRun = false,
      limit = 100
    } = options;

    console.log('🚀 Iniciando sincronização completa do Bling...');
    console.log(`📊 Opções: Produtos=${syncProducts}, Categorias=${syncCategories}, Estoque=${syncStock}, DryRun=${dryRun}, Limite=${limit}`);

    const result: SyncResult = {
      success: false,
      message: '',
      stats: {
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0
      },
      details: []
    };

    try {
      // 1. Sincronizar categorias primeiro
      if (syncCategories) {
        console.log('📂 Sincronizando categorias...');
        const categoryResult = await this.syncCategories(dryRun);
        result.stats.processed += categoryResult.processed;
        result.stats.successful += categoryResult.successful;
        result.stats.failed += categoryResult.failed;
        result.stats.skipped += categoryResult.skipped;
        result.details.push(...categoryResult.details);
      }

      // 2. Sincronizar produtos
      if (syncProducts) {
        console.log('📦 Sincronizando produtos...');
        const productResult = await this.syncProducts({
          syncStock, 
          dryRun, 
          limit 
        });
        
        result.stats.processed += productResult.processed;
        result.stats.successful += productResult.successful;
        result.stats.failed += productResult.failed;
        result.stats.skipped += productResult.skipped;
        result.details.push(...productResult.details);
      }

      // 3. Limpeza de dados órfãos
      if (!dryRun) {
        console.log('🧹 Limpando dados órfãos...');
        await this.cleanupOrphanedData();
      }

      result.success = true;
      result.message = `Sincronização concluída: ${result.stats.successful} produtos, ${result.stats.processed} processados, ${result.stats.failed} erros`;

      console.log('✅ Sincronização completa finalizada!');
      console.log(`📊 Resumo: ${result.stats.successful}/${result.stats.processed} produtos, ${result.stats.failed} erros`);

    } catch (error: any) {
      result.success = false;
      result.message = `Erro na sincronização: ${error.message}`;
      console.error('❌ Erro na sincronização:', error);
    }

      return result;
  }

  // ==========================================
  // SINCRONIZAÇÃO DE CATEGORIAS
  // ==========================================
  
  private async syncCategories(dryRun: boolean = false): Promise<{
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    details: Array<{
      blingId: number;
      name: string;
      status: 'success' | 'failed' | 'skipped';
      error?: string;
    }>;
  }> {
    const result = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        blingId: number;
        name: string;
        status: 'success' | 'failed' | 'skipped';
        error?: string;
      }>
    };

    try {
      const blingCategories = await blingOAuthService.getCategories();
      
      for (const blingCategory of blingCategories) {
        try {
          const categoryData = {
            name: blingCategory.descricao || `Categoria ${blingCategory.id}`,
            description: `Categoria importada do Bling (ID: ${blingCategory.id})`
          };

          if (dryRun) {
            console.log(`[DRY RUN] Categoria: ${categoryData.name}`);
            result.details.push({
              blingId: blingCategory.id,
              name: categoryData.name,
              status: 'skipped'
            });
            result.skipped++;
            continue;
          }

          // Verificar se categoria já existe
          const existingCategory = await prisma.category.findFirst({
            where: { name: categoryData.name }
          });

          if (existingCategory) {
            // Atualizar categoria existente
            await prisma.category.update({
              where: { id: existingCategory.id },
              data: {
                description: categoryData.description,
                updatedAt: new Date()
              }
            });

            result.details.push({
              blingId: blingCategory.id,
              name: categoryData.name,
              status: 'success'
            });
            result.successful++;
          } else {
            // Criar nova categoria
            await prisma.category.create({
              data: categoryData
            });

            result.details.push({
              blingId: blingCategory.id,
              name: categoryData.name,
              status: 'success'
            });
            result.successful++;
          }

          result.processed++;
          console.log(`✅ Categoria sincronizada: ${categoryData.name}`);

        } catch (error: any) {
          console.error(`❌ Erro ao sincronizar categoria ${blingCategory.id}:`, error.message);
          result.failed++;
          result.details.push({
            blingId: blingCategory.id,
            name: blingCategory.descricao || 'Categoria sem nome',
            status: 'failed',
            error: error.message
          });
        }
      }

    } catch (error: any) {
      console.error('❌ Erro ao obter categorias do Bling:', error.message);
      throw error;
    }

    return result;
  }

  // ==========================================
  // SINCRONIZAÇÃO DE PRODUTOS
  // ==========================================
  
  private async syncProducts(options: {
    syncStock: boolean;
    dryRun: boolean;
    limit: number;
  }): Promise<{
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    details: Array<{
      blingId: number;
      name: string;
      status: 'success' | 'failed' | 'skipped';
      error?: string;
    }>;
  }> {
    const { syncStock, dryRun, limit } = options;
    
    const result = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        blingId: number;
        name: string;
        status: 'success' | 'failed' | 'skipped';
        error?: string;
      }>
    };

    try {
      // Obter produtos do Bling
      const blingProductsResponse = await blingOAuthService.getProducts({
        limit,
        active: true
      });

      const blingProducts = blingProductsResponse.products;
      result.processed = blingProducts.length;

      console.log(`📦 Processando ${result.processed} produtos do Bling...`);

      for (const blingProduct of blingProducts) {
        try {
          await this.syncSingleProduct(blingProduct, syncStock, dryRun, result);
        } catch (error: any) {
          console.error(`❌ Erro ao sincronizar produto ${blingProduct.id}:`, error.message);
          result.failed++;
          result.details.push({
            blingId: blingProduct.id,
            name: blingProduct.nome,
            status: 'failed',
            error: error.message
          });
        }
      }

    } catch (error: any) {
      console.error('❌ Erro ao obter produtos do Bling:', error.message);
      throw error;
    }

    return result;
  }

  // ==========================================
  // SINCRONIZAÇÃO DE PRODUTO INDIVIDUAL
  // ==========================================
  
  private async syncSingleProduct(
    blingProduct: BlingProduct,
    syncStock: boolean,
    dryRun: boolean,
    result: any
  ): Promise<void> {
    // Validar dados essenciais
    if (!blingProduct.nome || blingProduct.preco <= 0) {
      console.log(`⚠️ Produto ${blingProduct.id} ignorado: dados inválidos`);
      result.skipped++;
      result.details.push({
        blingId: blingProduct.id,
        name: blingProduct.nome || 'Nome não informado',
        status: 'skipped'
      });
      return;
    }

    // Preparar dados do produto
    const stock = syncStock && blingProduct.estoques?.length 
      ? blingProduct.estoques[0].saldoFisico || 0 
      : 0;

    const productData = {
      name: blingProduct.nome,
      description: blingProduct.descricao || `Produto importado do Bling (Código: ${blingProduct.codigo})`,
      price: blingProduct.preco,
      stock: stock,
      blingId: BigInt(blingProduct.id), // Salvar ID do Bling
      imageUrl: blingProduct.imagemURL || null, // Temporário, será atualizado pelas imagens
      categoryId: await this.findOrCreateCategoryId(blingProduct.categoria),
      updatedAt: new Date()
    };

    if (dryRun) {
      console.log(`[DRY RUN] Produto: ${productData.name} - R$ ${productData.price} - Estoque: ${productData.stock}`);
      result.details.push({
        blingId: blingProduct.id,
        name: productData.name,
        status: 'skipped'
      });
      return;
    }

    // Verificar se produto já existe (por blingId, nome ou código)
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { blingId: BigInt(blingProduct.id) },
          { name: productData.name },
          { description: { contains: blingProduct.codigo } }
        ]
      },
      include: {
        variants: true,
        images: true
      }
    });

    let productId: number;

    if (existingProduct) {
      // Atualizar produto existente
      const updatedProduct = await prisma.product.update({
        where: { id: existingProduct.id },
        data: productData
      });

      productId = updatedProduct.id;

      // Remover imagens antigas se existirem
      await prisma.productImage.deleteMany({
        where: { productId: existingProduct.id }
      });

      // Sincronizar variações se existirem
      if (blingProduct.variacao?.length) {
        await this.syncProductVariants(updatedProduct.id, blingProduct.variacao, dryRun);
      }

      result.successful++;
      result.details.push({
        blingId: blingProduct.id,
        name: productData.name,
        status: 'success'
      });

      console.log(`✅ Produto atualizado: ${productData.name}`);
    } else {
      // Criar novo produto
      const newProduct = await prisma.product.create({
        data: productData
      });

      productId = newProduct.id;

      // Sincronizar variações se existirem
      if (blingProduct.variacao?.length) {
        await this.syncProductVariants(newProduct.id, blingProduct.variacao, dryRun);
      }

      result.successful++;
      result.details.push({
        blingId: blingProduct.id,
        name: productData.name,
        status: 'success'
      });

      console.log(`✅ Produto criado: ${productData.name}`);
    }

    // Baixar e salvar imagens do produto
    const imagesProcessed = await this.saveProductImages(productId, blingProduct);
    console.log(`📸 ${imagesProcessed} imagens processadas para ${blingProduct.nome}`);
  }

  // ==========================================
  // SINCRONIZAÇÃO DE VARIAÇÕES
  // ==========================================
  
  private async syncProductVariants(
    productId: number,
    blingVariants: Array<{
      id: number;
      nome: string;
      preco: number;
      estoque: number;
      codigo: string;
    }>,
    dryRun: boolean
  ): Promise<void> {
    if (dryRun) {
      console.log(`[DRY RUN] ${blingVariants.length} variações para produto ${productId}`);
      return;
    }

    for (const variant of blingVariants) {
      try {
        const variantData = {
          productId,
          size: variant.nome,
          price: variant.preco,
          stock: variant.estoque,
          sku: variant.codigo,
          isActive: true,
          updatedAt: new Date()
        };

        // Verificar se variação já existe
        const existingVariant = await prisma.productVariant.findFirst({
          where: {
            productId,
            size: variant.nome
          }
        });

        if (existingVariant) {
          await prisma.productVariant.update({
            where: { id: existingVariant.id },
            data: variantData
          });
        } else {
          await prisma.productVariant.create({
            data: variantData
          });
        }

        console.log(`✅ Variação sincronizada: ${variant.nome} - R$ ${variant.preco}`);
      } catch (error: any) {
        console.error(`❌ Erro ao sincronizar variação ${variant.id}:`, error.message);
      }
    }
  }

  // ==========================================
  // UTILITÁRIOS
  // ==========================================
  
  private async findOrCreateCategoryId(blingCategory?: { id: number; descricao: string }): Promise<number | null> {
    if (!blingCategory) return null;

    try {
      const categoryName = blingCategory.descricao || `Categoria ${blingCategory.id}`;
      
      let category = await prisma.category.findFirst({
        where: { name: categoryName }
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: categoryName,
            description: `Categoria importada do Bling (ID: ${blingCategory.id})`
          }
        });
      }

      return category.id;
    } catch (error) {
      console.error('❌ Erro ao processar categoria:', error);
      return null;
    }
  }

  // ==========================================
  // SINCRONIZAÇÃO APENAS DE ESTOQUE
  // ==========================================
  
  async syncStockOnly(options: {
    dryRun?: boolean;
    productIds?: number[];
  } = {}): Promise<{
    success: boolean;
    message: string;
    updated: number;
    errors: number;
  }> {
    const { dryRun = false, productIds } = options;
    
    console.log('📊 Sincronizando apenas estoque do Bling...');
    
    let updated = 0;
    let errors = 0;

    try {
      const blingProductsResponse = await blingOAuthService.getProducts({
        limit: 1000,
        active: true
      });

      const blingProducts = blingProductsResponse.products;

      for (const blingProduct of blingProducts) {
        try {
          // Filtrar por IDs específicos se fornecidos
          if (productIds && !productIds.includes(blingProduct.id)) {
            continue;
          }

          const stock = blingProduct.estoques?.length 
            ? blingProduct.estoques[0].saldoFisico || 0 
            : 0;

          if (dryRun) {
            console.log(`[DRY RUN] ${blingProduct.nome}: estoque ${stock}`);
            continue;
          }

          // Encontrar produto no banco local
          const localProduct = await prisma.product.findFirst({
            where: {
              OR: [
                { name: blingProduct.nome },
                { description: { contains: blingProduct.codigo } }
              ]
            }
          });

          if (localProduct) {
            await prisma.product.update({
              where: { id: localProduct.id },
              data: { 
                stock,
                updatedAt: new Date()
              }
            });
            updated++;
            console.log(`✅ Estoque atualizado: ${blingProduct.nome} = ${stock}`);
          }

        } catch (error: any) {
          console.error(`❌ Erro ao atualizar estoque do produto ${blingProduct.id}:`, error.message);
          errors++;
        }
      }

      return {
        success: errors === 0,
        message: `Estoque sincronizado: ${updated} produtos atualizados, ${errors} erros`,
        updated,
        errors
      };

    } catch (error: any) {
      console.error('❌ Erro na sincronização de estoque:', error.message);
      return {
        success: false,
        message: `Erro na sincronização: ${error.message}`,
        updated,
        errors: errors + 1
      };
    }
  }

  // ==========================================
  // LIMPEZA E MANUTENÇÃO
  // ==========================================
  
  async cleanupOrphanedData(): Promise<{
    success: boolean;
    message: string;
    cleaned: {
      variants: number;
      images: number;
    };
  }> {
    console.log('🧹 Limpando dados órfãos...');
    
    try {
      // Limpar variações órfãs (sem referência válida a produto)
      const orphanedVariantsResult = await prisma.$executeRaw`
        DELETE FROM "ProductVariant" 
        WHERE "productId" NOT IN (SELECT id FROM "Product")
      `;

      // Limpar imagens órfãs (sem referência válida a produto)
      const orphanedImagesResult = await prisma.$executeRaw`
        DELETE FROM "ProductImage" 
        WHERE "productId" NOT IN (SELECT id FROM "Product")
      `;

      return {
        success: true,
        message: `Limpeza concluída: ${orphanedVariantsResult} variações e ${orphanedImagesResult} imagens removidas`,
        cleaned: {
          variants: Number(orphanedVariantsResult),
          images: Number(orphanedImagesResult)
        }
      };

    } catch (error: any) {
      console.error('❌ Erro na limpeza:', error.message);
      return {
        success: false,
        message: `Erro na limpeza: ${error.message}`,
        cleaned: {
          variants: 0,
          images: 0
        }
      };
    }
  }

  async syncProductBySku(sku: string) {
    console.log(`🔄 Iniciando sincronização para o produto com SKU: ${sku}`);

    try {
      // Buscar vários produtos e filtrar pelo código exato
      const blingProductsResponse = await blingOAuthService.getProducts({ 
        search: sku,
        limit: 20 // Buscar mais para garantir
      });

      const blingProduct = blingProductsResponse.products.find(
        (p: any) => p.codigo === sku || p.code === sku
      );

      if (!blingProduct) {
        console.error(`❌ Produto com SKU ${sku} não encontrado no Bling.`);
        throw new Error(`Produto com SKU ${sku} não encontrado no Bling.`);
      }

      const blingProductId = blingProduct.id;
      console.log(`✅ Produto encontrado no Bling. ID: ${blingProductId}, Nome: ${blingProduct.nome}`);

      // 2. Obter estoque do produto
      const stockQuantity = blingProduct.estoques?.length 
        ? blingProduct.estoques[0].saldoFisico || 0 
        : 0;
      console.log(`📦 Estoque do produto: ${stockQuantity}`);

      // 3. Mapear e salvar a categoria
      const categoryName = blingProduct.categoria?.descricao || 'Sem Categoria';
      let category = await prisma.category.findUnique({
        where: { name: categoryName },
      });
      
      if (!category) {
        console.log(`📁 Categoria "${categoryName}" não encontrada. Criando...`);
        category = await prisma.category.create({
          data: { 
            name: categoryName, 
            description: `Categoria importada do Bling - ${categoryName}` 
          },
        });
        console.log(`✅ Categoria "${categoryName}" criada com ID: ${category.id}`);
      }

      // 4. Validar e preparar dados do produto
      const productName = blingProduct.nome || `Produto ${sku}`;
      const productPrice = parseFloat(blingProduct.preco?.toString() || '0');
      const productSku = blingProduct.codigo || sku;

      // Validações rigorosas
      if (!productName || productName.trim() === '') {
        throw new Error(`Nome do produto é obrigatório. Produto SKU: ${sku}`);
      }
      
      if (!productSku || productSku.trim() === '') {
        throw new Error(`SKU do produto é obrigatório. Produto: ${productName}`);
      }
      
      if (isNaN(productPrice) || productPrice < 0) {
        throw new Error(`Preço inválido para o produto ${productName}: ${productPrice}`);
      }
      
      if (!category || !category.id) {
        throw new Error(`Categoria inválida para o produto ${productName}`);
      }

      // 5. Preparar dados para upsert
      const productData = {
        name: productName,
        sku: productSku,
        price: productPrice,
        stock: stockQuantity,
        description: blingProduct.descricao || '',
        imageUrl: blingProduct.imagemURL || null,
        blingId: BigInt(blingProductId),
        categoryId: category.id,
        updatedAt: new Date()
      };

      console.log(`💾 Realizando upsert do produto "${productData.name}" no banco de dados...`);
      console.log(`📊 Dados do produto:`, {
        name: productData.name,
        sku: productData.sku,
        price: productData.price,
        stock: productData.stock,
        blingId: blingProductId.toString(), // Converter BigInt para string para logging
        categoryId: productData.categoryId
      });

      // 6. Executar upsert
      const savedProduct = await prisma.product.upsert({
        where: { sku: productSku },
        update: {
          name: productData.name,
          price: productPrice,
          stock: productData.stock,
          description: productData.description,
          imageUrl: productData.imageUrl,
          blingId: BigInt(blingProductId),
          categoryId: productData.categoryId,
          updatedAt: productData.updatedAt
        },
        create: {
          name: productData.name,
          sku: productData.sku,
          price: productPrice,
          stock: productData.stock,
          description: productData.description,
          imageUrl: productData.imageUrl,
          blingId: BigInt(blingProductId),
          categoryId: productData.categoryId
        },
        include: {
          category: true
        }
      });

      console.log(`✅ Produto salvo com sucesso! ID local: ${savedProduct.id}`);
      
      // 7. Buscar detalhes completos do produto incluindo imagens
      let blingProductWithDetails = blingProduct;
      try {
        blingProductWithDetails = await blingOAuthService.getProductWithFullDetails(blingProductId);
        console.log(`🔍 Detalhes completos obtidos para ${blingProductWithDetails.nome}`);
      } catch (detailsError) {
        console.warn(`⚠️ Não foi possível obter detalhes completos, usando dados básicos`);
      }

      // 8. Processar e salvar todas as imagens do produto
      const imagesProcessed = await this.saveProductImages(savedProduct.id, blingProductWithDetails);
      console.log(`📸 ${imagesProcessed} imagens processadas para ${blingProductWithDetails.nome}`);

      return {
        ...savedProduct,
        imagesProcessed
      };

    } catch (error: any) {
      console.error(`❌ Erro ao sincronizar produto com SKU ${sku}:`, error);
      throw new Error(`Erro ao sincronizar produto com SKU ${sku}: ${error.message}`);
    }
  }

  // ==========================================
  // DOWNLOAD E SALVAMENTO DE IMAGENS NO MINIO
  // ==========================================
  
  /**
   * Baixa uma imagem da URL do Bling e salva no MinIO
   * @param imageUrl URL da imagem no Bling
   * @param productId ID do produto
   * @param productName Nome do produto (para logs)
   * @param isMain Se é a imagem principal
   * @returns Promise com resultado do download
   */
  private async downloadAndSaveImageToMinio(
    imageUrl: string, 
    productId: number, 
    productName: string, 
    isMain: boolean = false
  ): Promise<ImageDownloadResult> {
    try {
      console.log(`📥 Baixando imagem${isMain ? ' principal' : ''} para ${productName}: ${imageUrl}`);

      // Baixar a imagem usando axios
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Determinar extensão do arquivo
      const contentType = response.headers['content-type'] || 'image/jpeg';
      let extension = '.jpg';
      
      if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('gif')) extension = '.gif';
      else if (contentType.includes('webp')) extension = '.webp';
      else if (contentType.includes('svg')) extension = '.svg';

      // Gerar nome único para o arquivo
      const fileName = `product_${productId}_${uuidv4()}${extension}`;
      const folder = 'products';

      // Upload para o MinIO
      const fileBuffer = Buffer.from(response.data);
      const publicUrl = await minioService.uploadFile(
        folder,
        fileName,
        fileBuffer,
        contentType
      );

      console.log(`✅ Imagem${isMain ? ' principal' : ''} salva no MinIO: ${fileName}`);
      
      return {
        success: true,
        imageUrl: publicUrl,
        fileName: fileName
      };

    } catch (error: any) {
      console.error(`❌ Erro ao baixar/salvar imagem para ${productName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Processa e salva todas as imagens de um produto do Bling no MinIO
   * @param productId ID do produto no banco local
   * @param blingProduct Dados do produto do Bling
   * @returns Promise com número de imagens processadas
   */
  private async saveProductImages(productId: number, blingProduct: BlingProduct): Promise<number> {
    try {
      console.log(`🖼️ Processando imagens para o produto: ${blingProduct.nome}`);
      
      // Limpar imagens existentes do produto
      await prisma.productImage.deleteMany({
        where: { productId: productId }
      });

      const imagesToProcess: Array<{ 
        url: string; 
        isMain: boolean; 
        order: number; 
        source: string; 
      }> = [];

      // 1. Imagem principal (imagemURL) - prioridade máxima
      if (blingProduct.imagemURL && this.isValidImageUrl(blingProduct.imagemURL)) {
        imagesToProcess.push({
          url: blingProduct.imagemURL,
          isMain: true,
          order: 0,
          source: 'imagemURL'
        });
      }

      // 2. Imagens de mídia (midia array)
      if (blingProduct.midia && Array.isArray(blingProduct.midia)) {
        blingProduct.midia.forEach((media, index) => {
          if (media.type === 1 && media.url && this.isValidImageUrl(media.url)) {
            imagesToProcess.push({
              url: media.url,
              isMain: false,
              order: (media.ordem || index) + 1,
              source: 'midia'
            });
          }
        });
      }

      // 3. Anexos (estrutura alternativa)
      if (blingProduct.anexos && Array.isArray(blingProduct.anexos)) {
        blingProduct.anexos.forEach((anexo, index) => {
          if (anexo.tipo === 'imagem' && anexo.url && this.isValidImageUrl(anexo.url)) {
            imagesToProcess.push({
              url: anexo.url,
              isMain: false,
              order: index + 100, // Ordem alta para não conflitar
              source: 'anexos'
            });
          }
        });
      }

      // 4. Informações adicionais
      if (blingProduct.informacoesAdicionais?.imagens && Array.isArray(blingProduct.informacoesAdicionais.imagens)) {
        blingProduct.informacoesAdicionais.imagens.forEach((img, index) => {
          if (img.url && this.isValidImageUrl(img.url)) {
            imagesToProcess.push({
              url: img.url,
              isMain: img.principal === true,
              order: img.ordem || (index + 200),
              source: 'informacoesAdicionais'
            });
          }
        });
      }

      // Se não há imagem principal mas há outras imagens, tornar a primeira como principal
      if (!imagesToProcess.some(img => img.isMain) && imagesToProcess.length > 0) {
        imagesToProcess[0].isMain = true;
        console.log(`📌 Primeira imagem definida como principal para ${blingProduct.nome}`);
      }

      // Remover duplicatas por URL
      const uniqueImages = imagesToProcess.filter((img, index, arr) => 
        arr.findIndex(other => other.url === img.url) === index
      );

      // Ordenar por ordem
      uniqueImages.sort((a, b) => a.order - b.order);

      console.log(`📊 ${uniqueImages.length} imagens únicas encontradas para ${blingProduct.nome}`);
      
      let processedCount = 0;
      let mainImageUrl: string | null = null;

      // Processar cada imagem
      for (const imageData of uniqueImages) {
        console.log(`📥 Processando imagem ${processedCount + 1}/${uniqueImages.length} (${imageData.source}): ${imageData.url}`);
        
        const downloadResult = await this.downloadAndSaveImageToMinio(
          imageData.url,
          productId,
          blingProduct.nome,
          imageData.isMain
        );

        if (downloadResult.success && downloadResult.imageUrl) {
          // Salvar no banco de dados
          await prisma.productImage.create({
            data: {
              productId: productId,
              imageUrl: downloadResult.imageUrl,
              isMain: imageData.isMain,
              order: imageData.order
            }
          });

          if (imageData.isMain) {
            mainImageUrl = downloadResult.imageUrl;
          }

          processedCount++;
          console.log(`✅ Imagem ${processedCount} salva: ${downloadResult.fileName}`);
        } else {
          console.warn(`⚠️ Falha ao processar imagem: ${downloadResult.error}`);
        }
      }

      // Atualizar campo imageUrl do produto com a imagem principal
      if (mainImageUrl) {
        await prisma.product.update({
          where: { id: productId },
          data: { imageUrl: mainImageUrl }
        });
        console.log(`📌 Imagem principal definida para ${blingProduct.nome}: ${mainImageUrl}`);
      }

      console.log(`✅ ${processedCount}/${uniqueImages.length} imagens processadas com sucesso para ${blingProduct.nome}`);
      return processedCount;

    } catch (error: any) {
      console.error(`❌ Erro ao processar imagens do produto ${blingProduct.nome}:`, error.message);
      return 0;
    }
  }

  /**
   * Valida se a URL é uma imagem válida
   * @param url URL para validar
   * @returns true se for uma URL de imagem válida
   */
  private isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
      
      // Verificar se tem extensão válida ou se é uma URL de serviço de imagem
      const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
      const isImageService = url.includes('bling.com.br') || url.includes('imgur.com') || url.includes('cloudinary.com');
      
      return hasValidExtension || isImageService;
    } catch {
      return false;
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS PARA TESTE
  // ==========================================
  
  async testDownloadImage(imageUrl: string, productId: number, productName: string, isMain: boolean = false): Promise<ImageDownloadResult> {
    return this.downloadAndSaveImageToMinio(imageUrl, productId, productName, isMain);
  }

  async testSaveProductImages(productId: number, blingProduct: BlingProduct): Promise<number> {
    return this.saveProductImages(productId, blingProduct);
  }
}

export const blingSyncService = new BlingSyncService(); 