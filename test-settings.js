const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSettings() {
  try {
    console.log('🔍 Testando configurações de frete...\n');

    // 1. Verificar se os campos existem no banco
    const settings = await prisma.appSettings.findMany({
      where: {
        category: 'shipping'
      },
      orderBy: {
        key: 'asc'
      }
    });

    console.log('📋 Configurações encontradas no banco:');
    settings.forEach(setting => {
      console.log(`  - ${setting.key}: ${setting.value}`);
    });

    // 2. Verificar especificamente os novos campos
    const emailSetting = await prisma.appSettings.findUnique({
      where: { key: 'shipping_origin_email' }
    });

    const cnpjSetting = await prisma.appSettings.findUnique({
      where: { key: 'shipping_origin_cnpj' }
    });

    console.log('\n📧 Campo de email:', emailSetting ? emailSetting.value : 'NÃO ENCONTRADO');
    console.log('🏢 Campo de CNPJ:', cnpjSetting ? cnpjSetting.value : 'NÃO ENCONTRADO');

    // 3. Testar inserção de dados de exemplo
    console.log('\n🧪 Testando inserção de dados de exemplo...');
    
    const testEmail = await prisma.appSettings.upsert({
      where: { key: 'shipping_origin_email' },
      update: { value: 'teste@empresa.com.br' },
      create: {
        key: 'shipping_origin_email',
        value: 'teste@empresa.com.br',
        category: 'shipping',
        description: 'Email da empresa remetente'
      }
    });

    const testCnpj = await prisma.appSettings.upsert({
      where: { key: 'shipping_origin_cnpj' },
      update: { value: '12.345.678/0001-90' },
      create: {
        key: 'shipping_origin_cnpj',
        value: '12.345.678/0001-90',
        category: 'shipping',
        description: 'CNPJ da empresa remetente'
      }
    });

    console.log('✅ Email salvo:', testEmail.value);
    console.log('✅ CNPJ salvo:', testCnpj.value);

    // 4. Verificar novamente
    const updatedSettings = await prisma.appSettings.findMany({
      where: {
        category: 'shipping'
      },
      orderBy: {
        key: 'asc'
      }
    });

    console.log('\n📋 Configurações após teste:');
    updatedSettings.forEach(setting => {
      console.log(`  - ${setting.key}: ${setting.value}`);
    });

    console.log('\n🎉 Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSettings(); 