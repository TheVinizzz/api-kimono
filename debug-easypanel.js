#!/usr/bin/env node

// Script de debug para EasyPanel
console.log('🔍 Debug EasyPanel - Iniciando...');

// Log todas as variáveis de ambiente relevantes
console.log('\n📋 Variáveis de Ambiente:');
const envVars = [
  'NODE_ENV', 'PORT', 'DATABASE_URL', 'HOSTNAME', 
  'HOME', 'PATH', 'PWD', 'USER', 'SHELL'
];

envVars.forEach(key => {
  const value = process.env[key];
  if (value) {
    // Mascarar informações sensíveis
    const masked = key.includes('DATABASE_URL') || key.includes('SECRET') 
      ? value.substring(0, 10) + '...' 
      : value;
    console.log(`  ${key}: ${masked}`);
  }
});

// Info do sistema
console.log('\n🖥️  Sistema:');
console.log(`  Platform: ${process.platform}`);
console.log(`  Architecture: ${process.arch}`);
console.log(`  Node.js: ${process.version}`);
console.log(`  Uptime: ${process.uptime()}s`);

// Info de memória
console.log('\n💾 Memória:');
const memory = process.memoryUsage();
Object.entries(memory).forEach(([key, value]) => {
  console.log(`  ${key}: ${Math.floor(value / 1024 / 1024)}MB`);
});

// Verificar arquivos importantes
console.log('\n📁 Arquivos:');
const fs = require('fs');
const files = [
  'package.json',
  'dist/index.js',
  'src/index.ts',
  'tsconfig.json',
  '.env'
];

files.forEach(file => {
  try {
    const exists = fs.existsSync(file);
    console.log(`  ${file}: ${exists ? '✅' : '❌'}`);
  } catch (err) {
    console.log(`  ${file}: ❌ (erro: ${err.message})`);
  }
});

// Teste de rede básico
console.log('\n🌐 Teste de Conectividade:');
const PORT = process.env.PORT || 4000;
console.log(`  Porta configurada: ${PORT}`);

// Iniciar servidor simples para teste
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    test: 'debug-server'
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor de debug rodando em 0.0.0.0:${PORT}`);
  console.log('🔗 Teste: curl http://localhost:' + PORT);
});

// Log de sinais recebidos
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM recebido - isso pode indicar problema no EasyPanel');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT recebido');
  process.exit(0);
});

// Keep alive
console.log('\n⏰ Mantendo vivo para debug (pressione Ctrl+C para sair)...'); 