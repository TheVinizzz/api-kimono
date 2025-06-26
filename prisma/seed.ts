import { PrismaClient, OrderStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Limpar banco de dados para evitar duplicações
  await prisma.shipmentUpdate.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🗑️ Banco de dados limpo');

  // Criar usuários
  const adminPassword = await bcrypt.hash('Lenux!990', 10);
  const customerPassword = await bcrypt.hash('Lenux!990', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@admin.com',
      name: 'Administrador',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'cliente@admin.com',
      name: 'Cliente Teste',
      password: customerPassword,
      role: UserRole.CUSTOMER,
    },
  });

  console.log('👤 Usuários criados');

  // Criar categorias
  const categoryKimonoTradicionais = await prisma.category.create({
    data: {
      name: 'Kimonos Tradicionais',
      description: 'Kimonos autênticos tradicionais japoneses',
    },
  });

  const categoryKimonoCasuais = await prisma.category.create({
    data: {
      name: 'Kimonos Casuais',
      description: 'Kimonos modernos para uso casual',
    },
  });

  const categoryAcessorios = await prisma.category.create({
    data: {
      name: 'Acessórios',
      description: 'Acessórios tradicionais japoneses para kimonos',
    },
  });

  console.log('📁 Categorias criadas');

  // Criar produtos
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Kimono Sakura Premium',
        description: 'Kimono tradicional com estampa de flores de cerejeira, feito em seda japonesa autêntica',
        price: 450.00,
        originalPrice: 580.00,
        stock: 8,
        imageUrl: 'https://i.imgur.com/kimono1.jpg',
        categoryId: categoryKimonoTradicionais.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kimono Yukata Verão',
        description: 'Yukata leve e confortável para festivais de verão, com estampa de ondas azuis',
        price: 180.00,
        originalPrice: 240.00,
        stock: 15,
        imageUrl: 'https://i.imgur.com/kimono2.jpg',
        categoryId: categoryKimonoCasuais.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Obi Tradicional Dourado',
        description: 'Faixa obi tradicional bordada à mão com fios dourados',
        price: 120.00,
        originalPrice: 160.00,
        stock: 20,
        imageUrl: 'https://via.placeholder.com/400x400/f8f9fa/6c757d?text=Kimono+Premium',
        categoryId: categoryAcessorios.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Kimono Floral Elegante',
        description: 'Kimono feminino com delicada estampa floral em tons pastéis',
        price: 320.00,
        originalPrice: 420.00,
        stock: 12,
        imageUrl: 'https://i.imgur.com/kimono3.jpg',
        categoryId: categoryKimonoCasuais.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Geta Tradicional',
        description: 'Sandálias geta tradicionais de madeira com tiras de tecido',
        price: 95.00,
        originalPrice: 120.00,
        stock: 25,
        imageUrl: 'https://i.imgur.com/geta1.jpg',
        categoryId: categoryAcessorios.id,
      },
    }),
  ]);

  console.log('🛍️ Produtos criados');

  // Datas para pedidos
  const datePedidoEntregue = new Date();
  datePedidoEntregue.setDate(datePedidoEntregue.getDate() - 15); // 15 dias atrás

  const datePedidoEmTransito = new Date();
  datePedidoEmTransito.setDate(datePedidoEmTransito.getDate() - 5); // 5 dias atrás

  const dataPedidoProcessando = new Date();
  dataPedidoProcessando.setDate(dataPedidoProcessando.getDate() - 1); // 1 dia atrás

  // Criar pedidos
  // Pedido 1 - Entregue
  const pedidoEntregue = await prisma.order.create({
    data: {
      userId: customer.id,
      status: OrderStatus.DELIVERED,
      total: 450.00,
      createdAt: datePedidoEntregue,
      updatedAt: datePedidoEntregue,
      trackingNumber: 'JP123456789BR',
      shippingCarrier: 'Japan Post',
      estimatedDelivery: new Date(datePedidoEntregue.getTime() + 12 * 24 * 60 * 60 * 1000), // 12 dias após criação
      departureDate: new Date(datePedidoEntregue.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 dias após criação
      currentLocation: 'Entregue ao destinatário',
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 1,
            price: products[0].price,
          },
        ],
      },
    },
  });

  // Atualizações de envio - Pedido 1 (Entregue)
  await prisma.shipmentUpdate.createMany({
    data: [
      {
        orderId: pedidoEntregue.id,
        status: 'Pedido recebido',
        location: 'Sistema',
        description: 'Seu pedido foi recebido e está sendo processado',
        timestamp: new Date(datePedidoEntregue.getTime()),
      },
      {
        orderId: pedidoEntregue.id,
        status: 'Em processamento',
        location: 'Tóquio, Japão',
        description: 'Seu pedido está sendo preparado para envio',
        timestamp: new Date(datePedidoEntregue.getTime() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEntregue.id,
        status: 'Enviado',
        location: 'Tóquio, Japão',
        description: 'Seu pedido foi enviado',
        timestamp: new Date(datePedidoEntregue.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEntregue.id,
        status: 'Em trânsito',
        location: 'Centro de Distribuição Internacional, Narita',
        description: 'Seu pedido está em trânsito internacional',
        timestamp: new Date(datePedidoEntregue.getTime() + 4 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEntregue.id,
        status: 'Chegada ao Brasil',
        location: 'Aeroporto Internacional de Guarulhos, Brasil',
        description: 'Seu pedido chegou ao Brasil e está aguardando liberação alfandegária',
        timestamp: new Date(datePedidoEntregue.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEntregue.id,
        status: 'Liberado pela alfândega',
        location: 'Guarulhos, Brasil',
        description: 'Seu pedido foi liberado pela alfândega',
        timestamp: new Date(datePedidoEntregue.getTime() + 9 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEntregue.id,
        status: 'Saiu para entrega',
        location: 'Centro de Distribuição Local',
        description: 'Seu pedido saiu para entrega',
        timestamp: new Date(datePedidoEntregue.getTime() + 11 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEntregue.id,
        status: 'Entregue',
        location: 'Endereço do destinatário',
        description: 'Seu pedido foi entregue com sucesso',
        timestamp: new Date(datePedidoEntregue.getTime() + 12 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Pedido 2 - Em Trânsito
  const pedidoEmTransito = await prisma.order.create({
    data: {
      userId: customer.id,
      status: OrderStatus.IN_TRANSIT,
      total: 480.00,
      createdAt: datePedidoEmTransito,
      updatedAt: datePedidoEmTransito,
      trackingNumber: 'JP987654321BR',
      shippingCarrier: 'Japan Express',
      estimatedDelivery: new Date(datePedidoEmTransito.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 dias após criação
      departureDate: new Date(datePedidoEmTransito.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 dias após criação
      currentLocation: 'Em trânsito para o Brasil',
      items: {
        create: [
          {
            productId: products[1].id,
            quantity: 2,
            price: products[1].price,
          },
          {
            productId: products[2].id,
            quantity: 1,
            price: products[2].price,
          },
        ],
      },
    },
  });

  // Atualizações de envio - Pedido 2 (Em Trânsito)
  await prisma.shipmentUpdate.createMany({
    data: [
      {
        orderId: pedidoEmTransito.id,
        status: 'Pedido recebido',
        location: 'Sistema',
        description: 'Seu pedido foi recebido e está sendo processado',
        timestamp: new Date(datePedidoEmTransito.getTime()),
      },
      {
        orderId: pedidoEmTransito.id,
        status: 'Em processamento',
        location: 'Osaka, Japão',
        description: 'Seu pedido está sendo preparado para envio',
        timestamp: new Date(datePedidoEmTransito.getTime() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEmTransito.id,
        status: 'Enviado',
        location: 'Osaka, Japão',
        description: 'Seu pedido foi enviado',
        timestamp: new Date(datePedidoEmTransito.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        orderId: pedidoEmTransito.id,
        status: 'Em trânsito',
        location: 'Aeroporto Internacional de Narita',
        description: 'Seu pedido está em trânsito para o Brasil',
        timestamp: new Date(datePedidoEmTransito.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Pedido 3 - Em Processamento
  const pedidoProcessando = await prisma.order.create({
    data: {
      userId: customer.id,
      status: OrderStatus.PROCESSING,
      total: 415.00,
      createdAt: dataPedidoProcessando,
      updatedAt: dataPedidoProcessando,
      trackingNumber: 'Ainda não disponível',
      shippingCarrier: 'Japan Post',
      estimatedDelivery: new Date(dataPedidoProcessando.getTime() + 20 * 24 * 60 * 60 * 1000), // 20 dias após criação
      currentLocation: 'Tóquio, Japão',
      items: {
        create: [
          {
            productId: products[4].id,
            quantity: 1,
            price: products[4].price,
          },
          {
            productId: products[3].id,
            quantity: 1,
            price: products[3].price,
          },
        ],
      },
    },
  });

  // Atualizações de envio - Pedido 3 (Processando)
  await prisma.shipmentUpdate.createMany({
    data: [
      {
        orderId: pedidoProcessando.id,
        status: 'Pedido recebido',
        location: 'Sistema',
        description: 'Seu pedido foi recebido e está sendo processado',
        timestamp: new Date(dataPedidoProcessando.getTime()),
      },
      {
        orderId: pedidoProcessando.id,
        status: 'Em processamento',
        location: 'Tóquio, Japão',
        description: 'Seu pedido está sendo preparado para envio',
        timestamp: new Date(dataPedidoProcessando.getTime() + 12 * 60 * 60 * 1000), // 12 horas depois
      },
    ],
  });

  console.log('📦 Pedidos criados com rastreamento');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 