/**
 * Serviço de Gerenciamento de Produtos com Bling
 * 
 * ESTRATÉGIA RECOMENDADA PARA PRODUTOS:
 * 
 * 1. FONTE ÚNICA DA VERDADE:
 *    - Sistema Local: Catálogo principal (preços, descrições, imagens)
 *    - Bling: Controle de estoque e movimentações
 * 
 * 2. SINCRONIZAÇÃO BIDIRECIONAL:
 *    - Local → Bling: Produtos, preços, dados básicos
 *    - Bling → Local: Estoque, movimentações, custos
 * 
 * 3. AUTOMAÇÃO INTELIGENTE:
 *    - Criação automática no Bling quando produto é criado localmente
 *    - Atualização de estoque em tempo real via webhooks
 *    - Sincronização de preços e promoções
 */

export interface ProductSyncStrategy {
  // Configurações de sincronização
  autoCreateInBling: boolean;
  autoUpdateStock: boolean;
  autoUpdatePrices: boolean;
  stockSource: 'LOCAL' | 'BLING' | 'HYBRID';
  priceSource: 'LOCAL' | 'BLING';
}

export interface ProductData {
  // Dados locais
  id: number;
  name: string;
  description: string;
  price: number;
  salePrice?: number;
  imageUrl: string;
  categoryId: number;
  
  // Dados Bling
  blingId?: number;
  blingCode?: string;
  blingStock?: number;
  blingCost?: number;
  
  // Controle de sincronização
  lastSyncAt?: Date;
  syncStatus: 'PENDING' | 'SYNCED' | 'ERROR';
  syncError?: string;
}

export class ProductManagementService {
  private config: ProductSyncStrategy;

  constructor(config: ProductSyncStrategy = {
    autoCreateInBling: true,
    autoUpdateStock: true,
    autoUpdatePrices: true,
    stockSource: 'BLING',
    priceSource: 'LOCAL'
  }) {
    this.config = config;
  }

  /**
   * 🆕 CRIAR PRODUTO COMPLETO
   * Cria produto localmente e sincroniza com Bling
   */
  async createProduct(productData: Omit<ProductData, 'id' | 'blingId' | 'syncStatus'>) {
    try {
      console.log(`🆕 Criando produto: ${productData.name}`);

      // 1. Criar produto localmente
      const localProduct = await this.createLocalProduct(productData);
      
      // 2. Criar no Bling (se configurado)
      if (this.config.autoCreateInBling) {
        const blingProduct = await this.createBlingProduct(localProduct);
        
        // 3. Atualizar referência local
        await this.updateLocalProductBlingId(localProduct.id, blingProduct.data.id);
        
        // 4. Configurar estoque inicial
        if (productData.blingStock && productData.blingStock > 0) {
          await this.setInitialStock(blingProduct.data.id, productData.blingStock);
        }
      }

      console.log(`✅ Produto ${productData.name} criado e sincronizado`);
      return localProduct;

    } catch (error) {
      console.error('❌ Erro ao criar produto:', error);
      throw error;
    }
  }

  /**
   * 📦 GERENCIAMENTO DE ESTOQUE
   * Controla estoque com sincronização automática
   */
  async updateStock(productId: number, quantity: number, operation: 'SET' | 'ADD' | 'SUBTRACT', reason?: string) {
    try {
      console.log(`📦 Atualizando estoque - Produto: ${productId}, Operação: ${operation}, Qtd: ${quantity}`);

      // 1. Buscar produto e validações
      const product = await this.getProductData(productId);
      if (!product.blingId) {
        throw new Error('Produto não está sincronizado com Bling');
      }

      // 2. Calcular nova quantidade
      let newQuantity: number;
      const currentStock = await this.getCurrentStock(product.blingId);
      
      switch (operation) {
        case 'SET':
          newQuantity = quantity;
          break;
        case 'ADD':
          newQuantity = currentStock + quantity;
          break;
        case 'SUBTRACT':
          newQuantity = Math.max(0, currentStock - quantity);
          break;
      }

      // 3. Atualizar no Bling
      await this.updateBlingStock({
        produto: { id: product.blingId },
        operacao: 'B', // Balanço (ajuste total)
        quantidade: newQuantity,
        observacoes: reason || `Ajuste via sistema - ${operation}`
      });

      // 4. Atualizar cache local
      await this.updateLocalStock(productId, newQuantity);

      console.log(`✅ Estoque atualizado: ${currentStock} → ${newQuantity}`);
      return { previousStock: currentStock, newStock: newQuantity };

    } catch (error) {
      console.error('❌ Erro ao atualizar estoque:', error);
      throw error;
    }
  }

  /**
   * 💰 GERENCIAMENTO DE PREÇOS
   * Atualiza preços com estratégia configurável
   */
  async updatePrice(productId: number, newPrice: number, salePrice?: number) {
    try {
      console.log(`💰 Atualizando preço - Produto: ${productId}, Preço: R$ ${newPrice}`);

      const product = await this.getProductData(productId);

      // 1. Atualizar localmente (sempre)
      await this.updateLocalPrice(productId, newPrice, salePrice);

      // 2. Atualizar no Bling (se configurado)
      if (this.config.priceSource === 'LOCAL' && product.blingId) {
        await this.updateBlingPrice(product.blingId, {
          preco: newPrice,
          precoPromocional: salePrice
        });
      }

      console.log(`✅ Preço atualizado para R$ ${newPrice}`);
      return { success: true, price: newPrice, salePrice };

    } catch (error) {
      console.error('❌ Erro ao atualizar preço:', error);
      throw error;
    }
  }

  /**
   * 🔄 SINCRONIZAÇÃO COMPLETA
   * Sincroniza todos os produtos entre sistemas
   */
  async syncAllProducts(direction: 'LOCAL_TO_BLING' | 'BLING_TO_LOCAL' | 'BIDIRECTIONAL' = 'BIDIRECTIONAL') {
    try {
      console.log(`🔄 Iniciando sincronização completa: ${direction}`);

      const results = {
        synced: 0,
        errors: 0,
        created: 0,
        updated: 0
      };

      if (direction === 'LOCAL_TO_BLING' || direction === 'BIDIRECTIONAL') {
        // Sincronizar produtos locais para Bling
        const localProducts = await this.getUnsyncedLocalProducts();
        
        for (const product of localProducts) {
          try {
            if (!product.blingId) {
              // Criar no Bling
              const blingProduct = await this.createBlingProduct(product);
              await this.updateLocalProductBlingId(product.id, blingProduct.data.id);
              results.created++;
            } else {
              // Atualizar no Bling
              await this.updateBlingProduct(product.blingId, {
                nome: product.name,
                preco: product.price,
                descricaoCurta: product.description
              });
              results.updated++;
            }
            
            await this.markProductAsSynced(product.id);
            results.synced++;
            
                     } catch (error: any) {
             console.error(`❌ Erro ao sincronizar produto ${product.id}:`, error);
             await this.markProductSyncError(product.id, error.message || 'Erro desconhecido');
             results.errors++;
           }
        }
      }

      if (direction === 'BLING_TO_LOCAL' || direction === 'BIDIRECTIONAL') {
        // Sincronizar estoque do Bling para local
        await this.syncStockFromBling();
      }

      console.log(`✅ Sincronização concluída:`, results);
      return results;

    } catch (error) {
      console.error('❌ Erro na sincronização completa:', error);
      throw error;
    }
  }

  /**
   * 📊 RELATÓRIO DE ESTOQUE
   * Gera relatório consolidado de estoque
   */
  async getStockReport() {
    try {
      console.log('📊 Gerando relatório de estoque...');

      const products = await this.getAllSyncedProducts();
      const report = [];

      for (const product of products) {
        if (product.blingId) {
          const blingStock = await this.getCurrentStock(product.blingId);
          const localStock = product.blingStock || 0;
          
          report.push({
            productId: product.id,
            name: product.name,
            blingId: product.blingId,
            localStock,
            blingStock,
            difference: blingStock - localStock,
            status: blingStock === localStock ? 'SYNCED' : 'DIVERGENT',
            lastSync: product.lastSyncAt
          });
        }
      }

      console.log(`✅ Relatório gerado para ${report.length} produtos`);
      return {
        totalProducts: report.length,
        syncedProducts: report.filter(p => p.status === 'SYNCED').length,
        divergentProducts: report.filter(p => p.status === 'DIVERGENT').length,
        products: report
      };

    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      throw error;
    }
  }

  /**
   * 🔔 WEBHOOK DE ESTOQUE
   * Processa notificações de mudança de estoque do Bling
   */
  async processStockWebhook(webhookData: {
    evento: string;
    dados: {
      id: number;
      estoque?: number;
      produto?: { id: number };
    };
  }) {
    try {
      console.log('🔔 Processando webhook de estoque:', webhookData.evento);

      if (webhookData.evento === 'estoque_alterado') {
        const blingProductId = webhookData.dados.produto?.id || webhookData.dados.id;
        const newStock = webhookData.dados.estoque;

        if (blingProductId && newStock !== undefined) {
          // Buscar produto local pelo ID do Bling
          const localProduct = await this.getProductByBlingId(blingProductId);
          
          if (localProduct) {
            // Atualizar estoque local
            await this.updateLocalStock(localProduct.id, newStock);
            console.log(`✅ Estoque atualizado via webhook: Produto ${localProduct.id} → ${newStock}`);
          }
        }
      }

      return { success: true, processed: true };

    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
      throw error;
    }
  }

  // ===================================
  // MÉTODOS AUXILIARES (IMPLEMENTAR)
  // ===================================

  private async createLocalProduct(data: any): Promise<ProductData> {
    // Implementar criação no banco local
    return { ...data, id: Date.now(), syncStatus: 'PENDING' };
  }

  private async createBlingProduct(product: ProductData) {
    // Implementar criação no Bling via API
    return {
      data: {
        id: Math.floor(Math.random() * 10000),
        nome: product.name,
        preco: product.price
      }
    };
  }

  private async updateLocalProductBlingId(localId: number, blingId: number) {
    // Implementar atualização da referência
    console.log(`Linking product ${localId} → Bling ${blingId}`);
  }

  private async setInitialStock(blingId: number, quantity: number) {
    // Implementar configuração de estoque inicial
    console.log(`Setting initial stock for Bling ${blingId}: ${quantity}`);
  }

  private async getProductData(productId: number): Promise<ProductData> {
    // Implementar busca do produto
    return {
      id: productId,
      name: 'Produto Exemplo',
      description: 'Descrição',
      price: 99.90,
      imageUrl: 'https://example.com/image.jpg',
      categoryId: 1,
      blingId: 123,
      syncStatus: 'SYNCED'
    };
  }

  private async getCurrentStock(blingId: number): Promise<number> {
    // Implementar consulta de estoque no Bling
    return 10;
  }

  private async updateBlingStock(stockData: any) {
    // Implementar atualização via Bling API
    console.log('Updating Bling stock:', stockData);
  }

  private async updateLocalStock(productId: number, quantity: number) {
    // Implementar atualização local
    console.log(`Local stock updated: Product ${productId} → ${quantity}`);
  }

  private async updateLocalPrice(productId: number, price: number, salePrice?: number) {
    // Implementar atualização de preço local
    console.log(`Local price updated: Product ${productId} → R$ ${price}`);
  }

  private async updateBlingPrice(blingId: number, priceData: any) {
    // Implementar atualização de preço no Bling
    console.log('Updating Bling price:', blingId, priceData);
  }

  private async getUnsyncedLocalProducts(): Promise<ProductData[]> {
    // Implementar busca de produtos não sincronizados
    return [];
  }

  private async updateBlingProduct(blingId: number, data: any) {
    // Implementar atualização no Bling
    console.log('Updating Bling product:', blingId, data);
  }

  private async markProductAsSynced(productId: number) {
    // Implementar marcação como sincronizado
    console.log(`Product ${productId} marked as synced`);
  }

  private async markProductSyncError(productId: number, error: string) {
    // Implementar marcação de erro
    console.log(`Product ${productId} sync error: ${error}`);
  }

  private async syncStockFromBling() {
    // Implementar sincronização de estoque do Bling
    console.log('Syncing stock from Bling...');
  }

  private async getAllSyncedProducts(): Promise<ProductData[]> {
    // Implementar busca de todos os produtos sincronizados
    return [];
  }

  private async getProductByBlingId(blingId: number): Promise<ProductData | null> {
    // Implementar busca por ID do Bling
    return null;
  }
} 