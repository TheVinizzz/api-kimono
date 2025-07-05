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
      value: '01310-100',
      description: 'CEP de origem para cálculos de frete',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_name',
      value: 'Kimono Store',
      description: 'Nome da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_address',
      value: 'Rua das Flores, 123',
      description: 'Endereço da empresa remetente',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_complement',
      value: 'Sala 45',
      description: 'Complemento do endereço da empresa',
      category: 'shipping'
    },
    {
      key: 'shipping_origin_neighborhood',
      value: 'Centro',
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
      value: '(11) 99999-9999',
      description: 'Telefone da empresa remetente',
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