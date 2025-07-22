import { PrismaClient, OrderStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inserindo configurações de frete...');

  // Configurações da aplicação para frete
  const appSettings = [
    {
      key: 'shipping_origin_zipcode',
      value: '04551-070',
      description: 'CEP de origem para cálculos de frete',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_name',
      value: 'Kimono Store - Artes Marciais',
      description: 'Nome da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_address',
      value: 'Rua das Artes Marciais, 456',
      description: 'Endereço da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_complement',
      value: 'Loja 1',
      description: 'Complemento do endereço da empresa',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_neighborhood',
      value: 'Vila Olímpia',
      description: 'Bairro da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_city',
      value: 'São Paulo',
      description: 'Cidade da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_state',
      value: 'SP',
      description: 'Estado da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_phone',
      value: '(11) 98765-4321',
      description: 'Telefone da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_email',
      value: 'contato@kimonostore.com.br',
      description: 'E-mail da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_cnpj',
      value: '12.345.678/0001-90',
      description: 'CNPJ da empresa remetente',
      category: 'shipping'
    }
  ];

  // Inserir apenas configurações que não existem
  for (const setting of appSettings) {
    await prisma.appSettings.upsert({
      where: { key: setting.key },
      update: {}, // Não atualizar se já existe
      create: setting
    });
    console.log(`📦 Configuração ${setting.key} inserida/verificada`);
  }

  console.log('✅ Configurações de frete criadas com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 