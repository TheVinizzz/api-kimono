// Script para testar a conexão com MinIO
// Execute com: node test-minio.js

const { S3Client, ListBucketsCommand, CreateBucketCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testMinioConnection() {
  console.log('🔍 Testando conexão com MinIO...\n');

  // Configuração do MinIO
  const s3Client = new S3Client({
    endpoint: process.env.MINIO_URL || 'https://shop-shop.9kbfkm.easypanel.host',
    credentials: {
      accessKeyId: process.env.MINIO_PUBLIC_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    region: process.env.MINIO_REGION || 'us-east-1',
    forcePathStyle: true,
  });

  const bucketName = process.env.MINIO_BUCKET || 'shopping-images';

  try {
    // Teste 1: Listar buckets
    console.log('📋 Teste 1: Listando buckets...');
    const listBucketsCommand = new ListBucketsCommand({});
    const buckets = await s3Client.send(listBucketsCommand);
    console.log('✅ Buckets encontrados:', buckets.Buckets.map(b => b.Name));

    // Teste 2: Verificar se o bucket do shopping existe
    console.log(`\n🪣 Teste 2: Verificando bucket '${bucketName}'...`);
    const bucketExists = buckets.Buckets.some(bucket => bucket.Name === bucketName);
    
    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' existe!`);
    } else {
      console.log(`⚠️  Bucket '${bucketName}' não existe. Tentando criar...`);
      
      // Criar bucket se não existir
      const createBucketCommand = new CreateBucketCommand({ Bucket: bucketName });
      await s3Client.send(createBucketCommand);
      console.log(`✅ Bucket '${bucketName}' criado com sucesso!`);
    }

    // Teste 3: Teste de upload simples
    console.log('\n📤 Teste 3: Teste de upload...');
    const testKey = 'test/test-file.txt';
    const testContent = 'Este é um arquivo de teste do Shopping API MinIO';
    
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    });
    
    await s3Client.send(putObjectCommand);
    console.log('✅ Upload de teste realizado com sucesso!');

    // Teste 4: Verificar se o arquivo foi enviado
    console.log('\n📋 Teste 4: Listando objetos no bucket...');
    const listObjectsCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'test/'
    });
    
    const objects = await s3Client.send(listObjectsCommand);
    console.log('✅ Objetos encontrados:', objects.Contents?.map(obj => obj.Key) || []);

    // Teste 5: Gerar URL pública
    console.log('\n🔗 Teste 5: Gerando URL pública...');
    const publicUrl = `${process.env.MINIO_PUBLIC_URL || process.env.MINIO_URL}/${bucketName}/${testKey}`;
    console.log('✅ URL pública:', publicUrl);

    // Teste 6: Cleanup - remover arquivo de teste
    console.log('\n🧹 Teste 6: Removendo arquivo de teste...');
    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey
    });
    
    await s3Client.send(deleteObjectCommand);
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