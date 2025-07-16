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
exports.blingSyncService = exports.BlingSyncService = void 0;
const client_1 = require("@prisma/client");
const bling_oauth_service_1 = __importDefault(require("./bling-oauth.service"));
const minio_service_1 = require("./minio.service");
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
const minioService = new minio_service_1.MinioService();
class BlingSyncService {
    // ==========================================
    // MÉTODO PRINCIPAL DE SINCRONIZAÇÃO
    // ==========================================
    syncAll() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { syncProducts = true, syncCategories = true, syncStock = true, dryRun = false, limit = 100 } = options;
            console.log('🚀 Iniciando sincronização completa do Bling...');
            console.log(`📊 Opções: Produtos=${syncProducts}, Categorias=${syncCategories}, Estoque=${syncStock}, DryRun=${dryRun}, Limite=${limit}`);
            const result = {
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
                    const categoryResult = yield this.syncCategories(dryRun);
                    result.stats.processed += categoryResult.processed;
                    result.stats.successful += categoryResult.successful;
                    result.stats.failed += categoryResult.failed;
                    result.stats.skipped += categoryResult.skipped;
                    result.details.push(...categoryResult.details);
                }
                // 2. Sincronizar produtos
                if (syncProducts) {
                    console.log('📦 Sincronizando produtos...');
                    const productResult = yield this.syncProducts({
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
                    yield this.cleanupOrphanedData();
                }
                result.success = true;
                result.message = `Sincronização concluída: ${result.stats.successful} produtos, ${result.stats.processed} processados, ${result.stats.failed} erros`;
                console.log('✅ Sincronização completa finalizada!');
                console.log(`📊 Resumo: ${result.stats.successful}/${result.stats.processed} produtos, ${result.stats.failed} erros`);
            }
            catch (error) {
                result.success = false;
                result.message = `Erro na sincronização: ${error.message}`;
                console.error('❌ Erro na sincronização:', error);
            }
            return result;
        });
    }
    // ==========================================
    // SINCRONIZAÇÃO DE CATEGORIAS
    // ==========================================
    syncCategories() {
        return __awaiter(this, arguments, void 0, function* (dryRun = false) {
            const result = {
                processed: 0,
                successful: 0,
                failed: 0,
                skipped: 0,
                details: []
            };
            try {
                const blingCategories = yield bling_oauth_service_1.default.getCategories();
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
                        const existingCategory = yield prisma.category.findFirst({
                            where: { name: categoryData.name }
                        });
                        if (existingCategory) {
                            // Atualizar categoria existente
                            yield prisma.category.update({
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
                        }
                        else {
                            // Criar nova categoria
                            yield prisma.category.create({
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
                    }
                    catch (error) {
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
            }
            catch (error) {
                console.error('❌ Erro ao obter categorias do Bling:', error.message);
                throw error;
            }
            return result;
        });
    }
    // ==========================================
    // SINCRONIZAÇÃO DE PRODUTOS
    // ==========================================
    syncProducts(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { syncStock, dryRun, limit } = options;
            const result = {
                processed: 0,
                successful: 0,
                failed: 0,
                skipped: 0,
                details: []
            };
            try {
                // Obter produtos do Bling
                const blingProductsResponse = yield bling_oauth_service_1.default.getProducts({
                    limit,
                    active: true
                });
                const blingProducts = blingProductsResponse.products;
                result.processed = blingProducts.length;
                console.log(`📦 Processando ${result.processed} produtos do Bling...`);
                for (const blingProduct of blingProducts) {
                    try {
                        yield this.syncSingleProduct(blingProduct, syncStock, dryRun, result);
                    }
                    catch (error) {
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
            }
            catch (error) {
                console.error('❌ Erro ao obter produtos do Bling:', error.message);
                throw error;
            }
            return result;
        });
    }
    // ==========================================
    // SINCRONIZAÇÃO DE PRODUTO INDIVIDUAL
    // ==========================================
    syncSingleProduct(blingProduct, syncStock, dryRun, result) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
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
            const stock = syncStock && ((_a = blingProduct.estoques) === null || _a === void 0 ? void 0 : _a.length)
                ? blingProduct.estoques[0].saldoFisico || 0
                : 0;
            const productData = {
                name: blingProduct.nome,
                description: blingProduct.descricao || `Produto importado do Bling (Código: ${blingProduct.codigo})`,
                price: blingProduct.preco,
                stock: stock,
                blingId: BigInt(blingProduct.id), // Salvar ID do Bling
                imageUrl: blingProduct.imagemURL || null, // Temporário, será atualizado pelas imagens
                categoryId: yield this.findOrCreateCategoryId(blingProduct.categoria),
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
            const existingProduct = yield prisma.product.findFirst({
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
            let productId;
            if (existingProduct) {
                // Atualizar produto existente
                const updatedProduct = yield prisma.product.update({
                    where: { id: existingProduct.id },
                    data: productData
                });
                productId = updatedProduct.id;
                // Remover imagens antigas se existirem
                yield prisma.productImage.deleteMany({
                    where: { productId: existingProduct.id }
                });
                // Sincronizar variações se existirem
                if ((_b = blingProduct.variacao) === null || _b === void 0 ? void 0 : _b.length) {
                    yield this.syncProductVariants(updatedProduct.id, blingProduct.variacao, dryRun);
                }
                result.successful++;
                result.details.push({
                    blingId: blingProduct.id,
                    name: productData.name,
                    status: 'success'
                });
                console.log(`✅ Produto atualizado: ${productData.name}`);
            }
            else {
                // Criar novo produto
                const newProduct = yield prisma.product.create({
                    data: productData
                });
                productId = newProduct.id;
                // Sincronizar variações se existirem
                if ((_c = blingProduct.variacao) === null || _c === void 0 ? void 0 : _c.length) {
                    yield this.syncProductVariants(newProduct.id, blingProduct.variacao, dryRun);
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
            const imagesProcessed = yield this.saveProductImages(productId, blingProduct);
            console.log(`📸 ${imagesProcessed} imagens processadas para ${blingProduct.nome}`);
        });
    }
    // ==========================================
    // SINCRONIZAÇÃO DE VARIAÇÕES
    // ==========================================
    syncProductVariants(productId, blingVariants, dryRun) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    const existingVariant = yield prisma.productVariant.findFirst({
                        where: {
                            productId,
                            size: variant.nome
                        }
                    });
                    if (existingVariant) {
                        yield prisma.productVariant.update({
                            where: { id: existingVariant.id },
                            data: variantData
                        });
                    }
                    else {
                        yield prisma.productVariant.create({
                            data: variantData
                        });
                    }
                    console.log(`✅ Variação sincronizada: ${variant.nome} - R$ ${variant.preco}`);
                }
                catch (error) {
                    console.error(`❌ Erro ao sincronizar variação ${variant.id}:`, error.message);
                }
            }
        });
    }
    // ==========================================
    // UTILITÁRIOS
    // ==========================================
    findOrCreateCategoryId(blingCategory) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!blingCategory)
                return null;
            try {
                const categoryName = blingCategory.descricao || `Categoria ${blingCategory.id}`;
                let category = yield prisma.category.findFirst({
                    where: { name: categoryName }
                });
                if (!category) {
                    category = yield prisma.category.create({
                        data: {
                            name: categoryName,
                            description: `Categoria importada do Bling (ID: ${blingCategory.id})`
                        }
                    });
                }
                return category.id;
            }
            catch (error) {
                console.error('❌ Erro ao processar categoria:', error);
                return null;
            }
        });
    }
    // ==========================================
    // SINCRONIZAÇÃO APENAS DE ESTOQUE
    // ==========================================
    syncStockOnly() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            var _a;
            const { dryRun = false, productIds } = options;
            console.log('📊 Sincronizando apenas estoque do Bling...');
            let updated = 0;
            let errors = 0;
            try {
                const blingProductsResponse = yield bling_oauth_service_1.default.getProducts({
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
                        const stock = ((_a = blingProduct.estoques) === null || _a === void 0 ? void 0 : _a.length)
                            ? blingProduct.estoques[0].saldoFisico || 0
                            : 0;
                        if (dryRun) {
                            console.log(`[DRY RUN] ${blingProduct.nome}: estoque ${stock}`);
                            continue;
                        }
                        // Encontrar produto no banco local
                        const localProduct = yield prisma.product.findFirst({
                            where: {
                                OR: [
                                    { name: blingProduct.nome },
                                    { description: { contains: blingProduct.codigo } }
                                ]
                            }
                        });
                        if (localProduct) {
                            yield prisma.product.update({
                                where: { id: localProduct.id },
                                data: {
                                    stock,
                                    updatedAt: new Date()
                                }
                            });
                            updated++;
                            console.log(`✅ Estoque atualizado: ${blingProduct.nome} = ${stock}`);
                        }
                    }
                    catch (error) {
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
            }
            catch (error) {
                console.error('❌ Erro na sincronização de estoque:', error.message);
                return {
                    success: false,
                    message: `Erro na sincronização: ${error.message}`,
                    updated,
                    errors: errors + 1
                };
            }
        });
    }
    // ==========================================
    // LIMPEZA E MANUTENÇÃO
    // ==========================================
    cleanupOrphanedData() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🧹 Limpando dados órfãos...');
            try {
                // Limpar variações órfãs (sem referência válida a produto)
                const orphanedVariantsResult = yield prisma.$executeRaw `
        DELETE FROM "ProductVariant" 
        WHERE "productId" NOT IN (SELECT id FROM "Product")
      `;
                // Limpar imagens órfãs (sem referência válida a produto)
                const orphanedImagesResult = yield prisma.$executeRaw `
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
            }
            catch (error) {
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
        });
    }
    syncProductBySku(sku) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            console.log(`🔄 Iniciando sincronização para o produto com SKU: ${sku}`);
            try {
                // Buscar vários produtos e filtrar pelo código exato
                const blingProductsResponse = yield bling_oauth_service_1.default.getProducts({
                    search: sku,
                    limit: 20 // Buscar mais para garantir
                });
                const blingProduct = blingProductsResponse.products.find((p) => p.codigo === sku || p.code === sku);
                if (!blingProduct) {
                    console.error(`❌ Produto com SKU ${sku} não encontrado no Bling.`);
                    throw new Error(`Produto com SKU ${sku} não encontrado no Bling.`);
                }
                const blingProductId = blingProduct.id;
                console.log(`✅ Produto encontrado no Bling. ID: ${blingProductId}, Nome: ${blingProduct.nome}`);
                // 2. Obter estoque do produto
                const stockQuantity = ((_a = blingProduct.estoques) === null || _a === void 0 ? void 0 : _a.length)
                    ? blingProduct.estoques[0].saldoFisico || 0
                    : 0;
                console.log(`📦 Estoque do produto: ${stockQuantity}`);
                // 3. Mapear e salvar a categoria
                const categoryName = ((_b = blingProduct.categoria) === null || _b === void 0 ? void 0 : _b.descricao) || 'Sem Categoria';
                let category = yield prisma.category.findUnique({
                    where: { name: categoryName },
                });
                if (!category) {
                    console.log(`📁 Categoria "${categoryName}" não encontrada. Criando...`);
                    category = yield prisma.category.create({
                        data: {
                            name: categoryName,
                            description: `Categoria importada do Bling - ${categoryName}`
                        },
                    });
                    console.log(`✅ Categoria "${categoryName}" criada com ID: ${category.id}`);
                }
                // 4. Validar e preparar dados do produto
                const productName = blingProduct.nome || `Produto ${sku}`;
                const productPrice = parseFloat(((_c = blingProduct.preco) === null || _c === void 0 ? void 0 : _c.toString()) || '0');
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
                const savedProduct = yield prisma.product.upsert({
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
                    blingProductWithDetails = yield bling_oauth_service_1.default.getProductWithFullDetails(blingProductId);
                    console.log(`🔍 Detalhes completos obtidos para ${blingProductWithDetails.nome}`);
                }
                catch (detailsError) {
                    console.warn(`⚠️ Não foi possível obter detalhes completos, usando dados básicos`);
                }
                // 8. Processar e salvar todas as imagens do produto
                const imagesProcessed = yield this.saveProductImages(savedProduct.id, blingProductWithDetails);
                console.log(`📸 ${imagesProcessed} imagens processadas para ${blingProductWithDetails.nome}`);
                return Object.assign(Object.assign({}, savedProduct), { imagesProcessed });
            }
            catch (error) {
                console.error(`❌ Erro ao sincronizar produto com SKU ${sku}:`, error);
                throw new Error(`Erro ao sincronizar produto com SKU ${sku}: ${error.message}`);
            }
        });
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
    downloadAndSaveImageToMinio(imageUrl_1, productId_1, productName_1) {
        return __awaiter(this, arguments, void 0, function* (imageUrl, productId, productName, isMain = false) {
            try {
                console.log(`📥 Baixando imagem${isMain ? ' principal' : ''} para ${productName}: ${imageUrl}`);
                // Baixar a imagem usando axios
                const response = yield axios_1.default.get(imageUrl, {
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
                if (contentType.includes('png'))
                    extension = '.png';
                else if (contentType.includes('gif'))
                    extension = '.gif';
                else if (contentType.includes('webp'))
                    extension = '.webp';
                else if (contentType.includes('svg'))
                    extension = '.svg';
                // Gerar nome único para o arquivo
                const fileName = `product_${productId}_${(0, uuid_1.v4)()}${extension}`;
                const folder = 'products';
                // Upload para o MinIO
                const fileBuffer = Buffer.from(response.data);
                const publicUrl = yield minioService.uploadFile(folder, fileName, fileBuffer, contentType);
                console.log(`✅ Imagem${isMain ? ' principal' : ''} salva no MinIO: ${fileName}`);
                return {
                    success: true,
                    imageUrl: publicUrl,
                    fileName: fileName
                };
            }
            catch (error) {
                console.error(`❌ Erro ao baixar/salvar imagem para ${productName}:`, error.message);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Processa e salva todas as imagens de um produto do Bling no MinIO
     * @param productId ID do produto no banco local
     * @param blingProduct Dados do produto do Bling
     * @returns Promise com número de imagens processadas
     */
    saveProductImages(productId, blingProduct) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(`🖼️ Processando imagens para o produto: ${blingProduct.nome}`);
                // Limpar imagens existentes do produto
                yield prisma.productImage.deleteMany({
                    where: { productId: productId }
                });
                const imagesToProcess = [];
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
                if (((_a = blingProduct.informacoesAdicionais) === null || _a === void 0 ? void 0 : _a.imagens) && Array.isArray(blingProduct.informacoesAdicionais.imagens)) {
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
                const uniqueImages = imagesToProcess.filter((img, index, arr) => arr.findIndex(other => other.url === img.url) === index);
                // Ordenar por ordem
                uniqueImages.sort((a, b) => a.order - b.order);
                console.log(`📊 ${uniqueImages.length} imagens únicas encontradas para ${blingProduct.nome}`);
                let processedCount = 0;
                let mainImageUrl = null;
                // Processar cada imagem
                for (const imageData of uniqueImages) {
                    console.log(`📥 Processando imagem ${processedCount + 1}/${uniqueImages.length} (${imageData.source}): ${imageData.url}`);
                    const downloadResult = yield this.downloadAndSaveImageToMinio(imageData.url, productId, blingProduct.nome, imageData.isMain);
                    if (downloadResult.success && downloadResult.imageUrl) {
                        // Salvar no banco de dados
                        yield prisma.productImage.create({
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
                    }
                    else {
                        console.warn(`⚠️ Falha ao processar imagem: ${downloadResult.error}`);
                    }
                }
                // Atualizar campo imageUrl do produto com a imagem principal
                if (mainImageUrl) {
                    yield prisma.product.update({
                        where: { id: productId },
                        data: { imageUrl: mainImageUrl }
                    });
                    console.log(`📌 Imagem principal definida para ${blingProduct.nome}: ${mainImageUrl}`);
                }
                console.log(`✅ ${processedCount}/${uniqueImages.length} imagens processadas com sucesso para ${blingProduct.nome}`);
                return processedCount;
            }
            catch (error) {
                console.error(`❌ Erro ao processar imagens do produto ${blingProduct.nome}:`, error.message);
                return 0;
            }
        });
    }
    /**
     * Valida se a URL é uma imagem válida
     * @param url URL para validar
     * @returns true se for uma URL de imagem válida
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string')
            return false;
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
            // Verificar se tem extensão válida ou se é uma URL de serviço de imagem
            const hasValidExtension = validExtensions.some(ext => pathname.endsWith(ext));
            const isImageService = url.includes('bling.com.br') || url.includes('imgur.com') || url.includes('cloudinary.com');
            return hasValidExtension || isImageService;
        }
        catch (_a) {
            return false;
        }
    }
    // ==========================================
    // MÉTODOS PÚBLICOS PARA TESTE
    // ==========================================
    testDownloadImage(imageUrl_1, productId_1, productName_1) {
        return __awaiter(this, arguments, void 0, function* (imageUrl, productId, productName, isMain = false) {
            return this.downloadAndSaveImageToMinio(imageUrl, productId, productName, isMain);
        });
    }
    testSaveProductImages(productId, blingProduct) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.saveProductImages(productId, blingProduct);
        });
    }
}
exports.BlingSyncService = BlingSyncService;
exports.blingSyncService = new BlingSyncService();
