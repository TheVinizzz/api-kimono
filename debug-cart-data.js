const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCartData() {
  try {
    console.log('🔍 Debugando dados do carrinho...\n');
    
    // Simular dados que vêm do carrinho (como no checkout)
    const cartData = {
      items: [
        {
          id: Date.now(),
          product: {
            id: 46,
            name: "Kimono Jiu Jitsu Yuri Black - Adulto",
            price: 389,
            stock: 30
          },
          quantity: 1,
          selectedVariant: {
            id: 149, // A1
            size: "A1",
            price: 389,
            stock: 20,
            isActive: true
          },
          variantId: 149,
          size: "A1"
        }
      ],
      total: 389
    };

    console.log('📋 DADOS DO CARRINHO:');
    console.log('=====================');
    console.log(JSON.stringify(cartData, null, 2));

    // Simular o mapeamento que acontece no checkout
    console.log('\n🔄 MAPEAMENTO NO CHECKOUT:');
    console.log('==========================');
    
    const mappedItems = cartData.items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.product.price),
      productVariantId: item.selectedVariant?.id || null,
      size: item.selectedVariant?.size || null
    }));

    console.log('📦 ITENS MAPEADOS:');
    mappedItems.forEach((item, index) => {
      console.log(`\n   Item ${index + 1}:`);
      console.log(`     ProductId: ${item.productId}`);
      console.log(`     Quantidade: ${item.quantity}`);
      console.log(`     Preço: R$ ${item.price}`);
      console.log(`     ProductVariantId: ${item.productVariantId}`);
      console.log(`     Tamanho: ${item.size}`);
    });

    // Verificar se os dados estão corretos
    console.log('\n✅ VERIFICAÇÃO:');
    console.log('===============');
    
    const hasVariantData = mappedItems.every(item => 
      item.productVariantId && item.size
    );
    
    console.log(`✅ Dados de variante presentes: ${hasVariantData}`);
    
    if (hasVariantData) {
      console.log('🎉 Os dados estão corretos! O problema deve estar em outro lugar.');
    } else {
      console.log('❌ Os dados estão incorretos! Verificar o mapeamento.');
    }

    // Simular criação de pedido
    console.log('\n🔄 SIMULANDO CRIAÇÃO DE PEDIDO:');
    console.log('===============================');
    
    const orderData = {
      userId: 1,
      total: 389,
      status: 'PENDING',
      customerName: 'Cliente Teste',
      customerEmail: 'teste@exemplo.com',
      customerPhone: '(11) 99999-9999',
      paymentMethod: 'PIX',
      shippingMethod: 'STANDARD',
      shippingAddress: JSON.stringify({
        name: 'Cliente Teste',
        street: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      }),
      items: {
        create: mappedItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          productVariantId: item.productVariantId || null,
          size: item.size || null
        }))
      }
    };

    console.log('📋 DADOS DO PEDIDO:');
    console.log('===================');
    console.log(`Total: R$ ${orderData.total}`);
    console.log(`Status: ${orderData.status}`);
    console.log(`Método de pagamento: ${orderData.paymentMethod}`);
    console.log('\n🛍️ ITENS:');
    orderData.items.create.forEach((item, index) => {
      console.log(`\n   Item ${index + 1}:`);
      console.log(`     ProductId: ${item.productId}`);
      console.log(`     Quantidade: ${item.quantity}`);
      console.log(`     Preço: R$ ${item.price}`);
      console.log(`     ProductVariantId: ${item.productVariantId}`);
      console.log(`     Tamanho: ${item.size}`);
    });

    // Criar pedido de teste
    console.log('\n🔄 CRIANDO PEDIDO DE TESTE...');
    const testOrder = await prisma.order.create({
      data: orderData,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true
              }
            },
            productVariant: {
              select: {
                id: true,
                size: true,
                price: true
              }
            }
          }
        }
      }
    });

    console.log('✅ PEDIDO CRIADO!');
    console.log('=================');
    console.log(`ID: ${testOrder.id}`);
    console.log(`Total: R$ ${testOrder.total}`);
    console.log(`Status: ${testOrder.status}`);
    
    console.log('\n🛍️ ITENS SALVOS:');
    testOrder.items.forEach((item, index) => {
      console.log(`\n   Item ${index + 1}:`);
      console.log(`     Produto: ${item.product.name}`);
      console.log(`     Preço: R$ ${item.price}`);
      console.log(`     Quantidade: ${item.quantity}`);
      console.log(`     Tamanho (campo size): ${item.size || 'NULL'}`);
      console.log(`     ProductVariantId: ${item.productVariantId || 'NULL'}`);
      
      if (item.productVariant) {
        console.log(`     ✅ Variante associada:`);
        console.log(`        - ID: ${item.productVariant.id}`);
        console.log(`        - Tamanho: ${item.productVariant.size}`);
        console.log(`        - Preço: R$ ${item.productVariant.price}`);
      } else {
        console.log(`     ❌ Nenhuma variante associada`);
      }
    });

    // Verificar se os dados foram salvos corretamente
    console.log('\n🔍 VERIFICAÇÃO FINAL:');
    console.log('=====================');
    
    const savedCorrectly = testOrder.items.every(item => 
      item.productVariantId && item.size
    );
    
    console.log(`✅ Dados salvos corretamente: ${savedCorrectly}`);
    
    if (savedCorrectly) {
      console.log('🎉 SUCESSO! O sistema está funcionando corretamente!');
      console.log('🔍 O problema deve estar no frontend - dados não estão sendo enviados corretamente.');
    } else {
      console.log('❌ PROBLEMA! Os dados não foram salvos corretamente no banco.');
    }

    console.log('\n🌐 URLs PARA TESTAR:');
    console.log('====================');
    console.log(`👤 Meus Pedidos: http://localhost:3000/meus-pedidos/${testOrder.id}`);
    console.log(`👨‍💼 Admin: http://localhost:3000/admin/pedidos/${testOrder.id}`);

  } catch (error) {
    console.error('❌ Erro ao debuggar dados do carrinho:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCartData();
