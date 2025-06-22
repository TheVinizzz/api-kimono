// Script para testar a conexão com MinIO
// Execute com: node test-minio.js

const AWS = require('aws-sdk');
require('dotenv').config();

async function testMinioConnection() {
  console.log('🔍 Testando conexão com MinIO...\n');

  // Configuração do MinIO
  const s3 = new AWS.S3({
    endpoint: process.env.MINIO_URL || 'https://shop-shop.9kbfkm.easypanel.host',
    accessKeyId: process.env.MINIO_PUBLIC_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
    s3ForcePathStyle: true,
    signatureVersion: 'v4',
  });

  const bucketName = process.env.MINIO_BUCKET || 'shopping-images';

  try {
    // Teste 1: Listar buckets
    console.log('📋 Teste 1: Listando buckets...');
    const buckets = await s3.listBuckets().promise();
    console.log('✅ Buckets encontrados:', buckets.Buckets.map(b => b.Name));

    // Teste 2: Verificar se o bucket do shopping existe
    console.log(`\n🪣 Teste 2: Verificando bucket '${bucketName}'...`);
    const bucketExists = buckets.Buckets.some(bucket => bucket.Name === bucketName);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' existe!`);
    } else {
      console.log(`⚠️  Bucket '${bucketName}' não existe. Tentando criar...`);
      
      // Criar bucket se não existir
      await s3.createBucket({ Bucket: bucketName }).promise();
      console.log(`✅ Bucket '${bucketName}' criado com sucesso!`);
    }

    // Teste 3: Teste de upload simples
    console.log('\n📤 Teste 3: Teste de upload...');
    const testKey = 'test/test-file.txt';
    const testContent = 'Este é um arquivo de teste do Shopping API MinIO';
    
    await s3.putObject({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    }).promise();
    
    console.log('✅ Upload de teste realizado com sucesso!');

    // Teste 4: Verificar se o arquivo foi enviado
    console.log('\n📋 Teste 4: Listando objetos no bucket...');
    const objects = await s3.listObjectsV2({
      Bucket: bucketName,
      Prefix: 'test/'
    }).promise();
    
    console.log('✅ Objetos encontrados:', objects.Contents?.map(obj => obj.Key) || []);

    // Teste 5: Gerar URL pública
    console.log('\n🔗 Teste 5: Gerando URL pública...');
    const publicUrl = `${process.env.MINIO_PUBLIC_URL || process.env.MINIO_URL}/${bucketName}/${testKey}`;
    console.log('✅ URL pública:', publicUrl);

    // Teste 6: Cleanup - remover arquivo de teste
    console.log('\n🧹 Teste 6: Removendo arquivo de teste...');
    await s3.deleteObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();
    console.log('✅ Arquivo de teste removido!');

    console.log('\n🎉 Todos os testes passaram! MinIO está configurado corretamente.');
    
  } catch (error) {
    console.error('\n❌ Erro nos testes:', error.message);
    console.error('\n🔧 Verifique:');
    console.error('   - Se o MinIO está rodando');
    console.error('   - Se as variáveis de ambiente estão corretas');
    console.error('   - Se as credenciais são válidas');
    process.exit(1);
  }
}

// Executar testes
testMinioConnection(); 