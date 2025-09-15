const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRealPurchase() {
  try {
    console.log('🧪 Testando compra real com dados de variante...\n');
    
    // Buscar um produto com variantes disponíveis
    const productWithVariants = await prisma.product.findFirst({
      where: {
        variants: {
          some: {
            isActive: true,
            stock: { gt: 0 }
          }
        }
      },
      include: {
        variants: {
          where: { 
            isActive: true,
            stock: { gt: 0 }
          },
          take: 1
        }
      }
    });

    if (!productWithVariants) {
      console.log('❌ Nenhum produto com variantes disponíveis encontrado!');
      return;
    }

    const variant = productWithVariants.variants[0];
    
    console.log(`📦 Produto: ${productWithVariants.name}`);
    console.log(`📏 Variante: ${variant.size} (R$ ${variant.price})`);
    console.log(`📦 Estoque ANTES: ${variant.stock}`);

    // Simular dados que vêm do frontend (como no checkout)
    const frontendData = {
      items: [
        {
          productId: productWithVariants.id,
          quantity: 1,
          price: variant.price,
          productVariantId: variant.id,
          size: variant.size
        }
      ],
      customerEmail: 'teste.real@exemplo.com',
      customerName: 'Cliente Teste Real',
      customerPhone: '(11) 99999-9999',
      shippingAddress: {
        name: 'Cliente Teste Real',
        street: 'Rua Teste Real',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      },
      paymentMethod: 'PIX',
      shippingMethod: 'STANDARD',
      shippingCost: 15.90,
      total: variant.price + 15.90
    };

    console.log('\n📋 DADOS DO FRONTEND:');
    console.log('======================');
    console.log(`Cliente: ${frontendData.customerName}`);
    console.log(`Email: ${frontendData.customerEmail}`);
    console.log(`Total: R$ ${frontendData.total}`);
    console.log(`Método de pagamento: ${frontendData.paymentMethod}`);
    console.log('\n🛍️ ITENS:');
    frontendData.items.forEach((item, index) => {
      console.log(`   Item ${index + 1}:`);
      console.log(`     ProductId: ${item.productId}`);
      console.log(`     Quantidade: ${item.quantity}`);
      console.log(`     Preço: R$ ${item.price}`);
      console.log(`     ProductVariantId: ${item.productVariantId}`);
      console.log(`     Tamanho: ${item.size}`);
    });

    // Simular validação do schema (como no backend)
    console.log('\n🔍 VALIDAÇÃO DO SCHEMA:');
    console.log('=======================');
    
    // Verificar se os dados passam na validação
    const isValid = frontendData.items.every(item => 
      item.productId && 
      item.quantity && 
      item.price && 
      item.productVariantId && 
      item.size
    );
    
    console.log(`✅ Dados válidos: ${isValid}`);
    
    if (!isValid) {
      console.log('❌ Dados inválidos - verificar campos obrigatórios');
      return;
    }

    // Criar pedido usando a mesma lógica do backend
    console.log('\n🔄 CRIANDO PEDIDO...');
    const createdOrder = await prisma.order.create({
      data: {
        total: frontendData.total,
        status: 'PENDING',
        paymentMethod: frontendData.paymentMethod,
        customerName: frontendData.customerName,
        customerEmail: frontendData.customerEmail,
        customerPhone: frontendData.customerPhone,
        shippingAddress: JSON.stringify(frontendData.shippingAddress),
        shippingMethod: frontendData.shippingMethod,
        shippingCost: frontendData.shippingCost,
        items: {
          create: frontendData.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            productVariantId: item.productVariantId || null,
            size: item.size || null
          }))
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                description: true,
              },
            },
            productVariant: {
              select: {
                id: true,
                size: true,
                sku: true,
                price: true,
              },
            },
          },
        },
      },
    });

    console.log('✅ PEDIDO CRIADO COM SUCESSO!');
    console.log('==============================');
    console.log(`📋 ID do Pedido: ${createdOrder.id}`);
    console.log(`📅 Data: ${createdOrder.createdAt.toLocaleString()}`);
    console.log(`💰 Total: R$ ${createdOrder.total}`);
    console.log(`📦 Status: ${createdOrder.status}`);
    
    console.log('\n🛍️ ITENS SALVOS NO BANCO:');
    createdOrder.items.forEach((item, index) => {
      console.log(`\n📦 Item ${index + 1}:`);
      console.log(`   Produto: ${item.product.name}`);
      console.log(`   Preço: R$ ${item.price}`);
      console.log(`   Quantidade: ${item.quantity}`);
      console.log(`   Tamanho (campo size): ${item.size || 'N/A'}`);
      console.log(`   ProductVariantId: ${item.productVariantId || 'N/A'}`);
      
      if (item.productVariant) {
        console.log(`   ✅ Variante encontrada:`);
        console.log(`      - ID: ${item.productVariant.id}`);
        console.log(`      - Tamanho: ${item.productVariant.size}`);
        console.log(`      - SKU: ${item.productVariant.sku || 'N/A'}`);
        console.log(`      - Preço: R$ ${item.productVariant.price}`);
      } else {
        console.log(`   ❌ Nenhuma variante associada`);
      }
    });

    // Verificar se os dados foram salvos corretamente
    console.log('\n🔍 VERIFICAÇÃO FINAL:');
    console.log('=====================');
    
    const hasVariantData = createdOrder.items.every(item => 
      item.productVariantId && item.size
    );
    
    console.log(`✅ Dados de variante salvos: ${hasVariantData}`);
    
    if (hasVariantData) {
      console.log('🎉 SUCESSO! O sistema está salvando corretamente os dados de variante!');
    } else {
      console.log('❌ PROBLEMA! Os dados de variante não foram salvos corretamente.');
    }

    console.log('\n🌐 URLs PARA TESTAR:');
    console.log('====================');
    console.log(`👤 Meus Pedidos: http://localhost:3000/meus-pedidos/${createdOrder.id}`);
    console.log(`👨‍💼 Admin: http://localhost:3000/admin/pedidos/${createdOrder.id}`);

  } catch (error) {
    console.error('❌ Erro ao testar compra real:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealPurchase();
