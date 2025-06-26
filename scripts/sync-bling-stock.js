#!/usr/bin/env node

/**
 * Script para sincronização de estoque com Bling API v3
 * Sincroniza produtos, categorias e estoque entre o sistema e o Bling
 */

require('dotenv').config();
const BlingService = require('../src/services/bling.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const blingService = new BlingService();

class BlingStockSync {
  constructor() {
    this.syncStats = {
      productsCreated: 0,
      productsUpdated: 0,
      stockUpdated: 0,
      errors: 0,
      startTime: Date.now()
    };
  }

  // Validar configuração
  validateConfig() {
    const required = [
      'BLING_CLIENT_ID',
      'BLING_CLIENT_SECRET', 
      'BLING_ACCESS_TOKEN'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ ERRO: Variáveis de ambiente obrigatórias não encontradas:');
      missing.forEach(key => console.log(`   ${key}`));
      console.log('\n💡 Execute primeiro: node scripts/bling-oauth-setup.js');
      process.exit(1);
    }

    console.log('✅ Configuração OAuth validada');
  }

  // Sincronizar produtos do sistema para o Bling
  async syncProductsToBling() {
    console.log('\n🔄 SINCRONIZANDO PRODUTOS PARA O BLING');
    console.log('=====================================');

    try {
      // Buscar produtos do sistema que não têm ID do Bling
      const products = await prisma.product.findMany({
        where: {
          blingId: null,
          active: true
        },
        include: {
          category: true,
          variants: true
        }
      });

      console.log(`📦 ${products.length} produtos encontrados para sincronizar`);

      for (const product of products) {
        try {
          console.log(`\n🔄 Processando: ${product.name}`);
          
          // Converter produto para formato Bling
          const blingProduct = this.convertProductToBlingFormat(product);
          
          // Criar produto no Bling
          const response = await blingService.createProduct(blingProduct);
          
          if (response.data) {
            // Atualizar produto no sistema com ID do Bling
            await prisma.product.update({
              where: { id: product.id },
              data: { 
                blingId: response.data.id,
                lastSyncAt: new Date()
              }
            });

            console.log(`   ✅ Produto criado no Bling (ID: ${response.data.id})`);
            this.syncStats.productsCreated++;
          }

        } catch (error) {
          console.error(`   ❌ Erro ao criar produto ${product.name}:`, error.message);
          this.syncStats.errors++;
        }
      }

    } catch (error) {
      console.error('❌ Erro na sincronização de produtos:', error.message);
      throw error;
    }
  }

  // Sincronizar estoque do Bling para o sistema
  async syncStockFromBling() {
    console.log('\n🔄 SINCRONIZANDO ESTOQUE DO BLING');
    console.log('==================================');

    try {
      // Buscar produtos que têm ID do Bling
      const products = await prisma.product.findMany({
        where: {
          blingId: { not: null },
          active: true
        }
      });

      console.log(`📦 ${products.length} produtos com ID Bling encontrados`);

      for (const product of products) {
        try {
          console.log(`\n🔄 Verificando estoque: ${product.name}`);
          
          // Buscar estoque no Bling
          const stockResponse = await blingService.getProductStock(product.blingId);
          
          if (stockResponse.data && stockResponse.data.saldoFisico !== undefined) {
            const blingStock = parseInt(stockResponse.data.saldoFisico) || 0;
            
            // Atualizar estoque no sistema se diferente
            if (product.stock !== blingStock) {
              await prisma.product.update({
                where: { id: product.id },
                data: { 
                  stock: blingStock,
                  lastSyncAt: new Date()
                }
              });

              console.log(`   ✅ Estoque atualizado: ${product.stock} → ${blingStock}`);
              this.syncStats.stockUpdated++;
            } else {
              console.log(`   ℹ️  Estoque já sincronizado: ${blingStock}`);
            }
          }

        } catch (error) {
          console.error(`   ❌ Erro ao sincronizar estoque ${product.name}:`, error.message);
          this.syncStats.errors++;
        }
      }

    } catch (error) {
      console.error('❌ Erro na sincronização de estoque:', error.message);
      throw error;
    }
  }

  // Sincronizar estoque do sistema para o Bling
  async syncStockToBling() {
    console.log('\n🔄 SINCRONIZANDO ESTOQUE PARA O BLING');
    console.log('====================================');

    try {
      // Buscar produtos que foram atualizados recentemente
      const products = await prisma.product.findMany({
        where: {
          blingId: { not: null },
          active: true,
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
          }
        }
      });

      console.log(`📦 ${products.length} produtos atualizados encontrados`);

      for (const product of products) {
        try {
          console.log(`\n🔄 Atualizando estoque: ${product.name}`);
          
          // Atualizar estoque no Bling
          const stockData = {
            produto: { id: product.blingId },
            deposito: { id: 1 }, // Depósito padrão
            operacao: 'B', // Balanço (ajuste)
            preco: product.price,
            quantidade: product.stock
          };

          await blingService.updateStock(stockData);
          
          // Marcar como sincronizado
          await prisma.product.update({
            where: { id: product.id },
            data: { lastSyncAt: new Date() }
          });

          console.log(`   ✅ Estoque atualizado no Bling: ${product.stock}`);
          this.syncStats.stockUpdated++;

        } catch (error) {
          console.error(`   ❌ Erro ao atualizar estoque ${product.name}:`, error.message);
          this.syncStats.errors++;
        }
      }

    } catch (error) {
      console.error('❌ Erro na atualização de estoque:', error.message);
      throw error;
    }
  }

  // Converter produto para formato Bling
  convertProductToBlingFormat(product) {
    return {
      nome: product.name,
      codigo: product.sku || `PROD-${product.id}`,
      preco: product.price,
      tipo: 'P', // Produto
      situacao: 'A', // Ativo
      descricao: product.description || '',
      descricaoCurta: product.shortDescription || product.name,
      dataValidade: null,
      unidade: 'UN',
      pesoLiquido: product.weight || 0,
      pesoBruto: product.weight || 0,
      volumes: 1,
      itensPorCaixa: 1,
      gtin: product.barcode || '',
      gtinEmbalagem: '',
      tipoProducao: 'P',
      condicao: 0, // Não especificado
      freteGratis: false,
      marca: product.brand || '',
      descricaoComplementar: '',
      linkExterno: '',
      observacoes: `Produto sincronizado do e-commerce em ${new Date().toLocaleString('pt-BR')}`,
      categoria: {
        id: 1 // Categoria padrão - pode ser mapeada
      },
      estoque: {
        minimo: product.minStock || 0,
        maximo: product.maxStock || 1000,
        crossdocking: 0,
        localizacao: ''
      },
      actionEstoque: 'A', // Alterar estoque
      dimensoes: {
        largura: product.width || 0,
        altura: product.height || 0,
        profundidade: product.depth || 0,
        unidadeMedida: 1 // Centímetros
      }
    };
  }

  // Exibir relatório de sincronização
  showSyncReport() {
    const duration = Math.round((Date.now() - this.syncStats.startTime) / 1000);
    
    console.log('\n📊 RELATÓRIO DE SINCRONIZAÇÃO');
    console.log('=============================');
    console.log(`⏱️  Tempo total: ${duration}s`);
    console.log(`✅ Produtos criados: ${this.syncStats.productsCreated}`);
    console.log(`🔄 Produtos atualizados: ${this.syncStats.productsUpdated}`);
    console.log(`📦 Estoques sincronizados: ${this.syncStats.stockUpdated}`);
    console.log(`❌ Erros: ${this.syncStats.errors}`);
    
    if (this.syncStats.errors === 0) {
      console.log('\n🎉 Sincronização concluída com sucesso!');
    } else {
      console.log('\n⚠️  Sincronização concluída com alguns erros.');
      console.log('   Verifique os logs acima para mais detalhes.');
    }
  }

  // Executar sincronização completa
  async runFullSync() {
    console.log('🚀 INICIANDO SINCRONIZAÇÃO COMPLETA COM BLING');
    console.log('==============================================');
    
    try {
      this.validateConfig();
      
      // Sincronizar produtos para o Bling
      await this.syncProductsToBling();
      
      // Sincronizar estoque do Bling
      await this.syncStockFromBling();
      
      // Sincronizar estoque para o Bling
      await this.syncStockToBling();
      
      this.showSyncReport();
      
    } catch (error) {
      console.error('\n❌ ERRO FATAL NA SINCRONIZAÇÃO:', error.message);
      this.syncStats.errors++;
      this.showSyncReport();
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  // Executar apenas sincronização de estoque
  async runStockSyncOnly() {
    console.log('🚀 INICIANDO SINCRONIZAÇÃO DE ESTOQUE');
    console.log('====================================');
    
    try {
      this.validateConfig();
      await this.syncStockFromBling();
      this.showSyncReport();
      
    } catch (error) {
      console.error('\n❌ ERRO NA SINCRONIZAÇÃO DE ESTOQUE:', error.message);
      this.syncStats.errors++;
      this.showSyncReport();
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Executar script
if (require.main === module) {
  const sync = new BlingStockSync();
  const command = process.argv[2];
  
  switch (command) {
    case 'stock':
      sync.runStockSyncOnly();
      break;
    case 'full':
    default:
      sync.runFullSync();
      break;
  }
}

module.exports = BlingStockSync; 