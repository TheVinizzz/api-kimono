#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando build...');

// Verificar se a pasta dist existe
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Pasta dist não encontrada');
  process.exit(1);
}

// Verificar se index.js existe
const indexPath = path.join(distPath, 'index.js');
if (!fs.existsSync(indexPath)) {
  console.error('❌ arquivo dist/index.js não encontrado');
  process.exit(1);
}

// Verificar se os arquivos principais foram compilados
const requiredFiles = [
  'config/index.js',
  'services/minio.service.js',
  'controllers/products.controller.js',
  'routes/products.routes.js'
];

for (const file of requiredFiles) {
  const filePath = path.join(distPath, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo ${file} não encontrado`);
    process.exit(1);
  }
}

console.log('✅ Build verificado com sucesso!');
console.log('📁 Arquivos compilados:');
console.log(`   - ${indexPath}`);
requiredFiles.forEach(file => {
  console.log(`   - ${path.join(distPath, file)}`);
});

process.exit(0); 