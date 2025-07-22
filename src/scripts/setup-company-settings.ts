import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupCompanySettings() {
  try {
    console.log('🏢 Configurando configurações da empresa...');

    const companySettings = [
      {
        key: 'company_name',
        value: 'Kimono Store - Artes Marciais',
        description: 'Nome da empresa',
        category: 'company'
      },
      {
        key: 'company_whatsapp',
        value: '5511987654321',
        description: 'Número do WhatsApp da empresa (com código do país)',
        category: 'company'
      },
      {
        key: 'company_address',
        value: 'Rua das Artes Marciais, 456 - Vila Olímpia, São Paulo - SP, CEP: 04551-070',
        description: 'Endereço completo da empresa',
        category: 'company'
      },
      {
        key: 'company_hours',
        value: 'Segunda à Sexta: 8h às 19h, Sábado: 8h às 17h, Domingo: 9h às 15h',
        description: 'Horário de funcionamento',
        category: 'company'
      },
      {
        key: 'pickup_instructions',
        value: 'Para retirada local: 1) Entre em contato via WhatsApp para agendar, 2) Traga documento com foto, 3) Informe o número do pedido na chegada. Estacionamento gratuito disponível.',
        description: 'Instruções para retirada local',
        category: 'company'
      }
    ];

    for (const setting of companySettings) {
      await prisma.appSettings.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          description: setting.description,
          category: setting.category,
          updatedAt: new Date()
        },
        create: setting
      });
      
      console.log(`✅ Configuração ${setting.key} criada/atualizada`);
    }

    console.log('🎉 Configurações da empresa configuradas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar configurações da empresa:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  setupCompanySettings();
}

export default setupCompanySettings; 