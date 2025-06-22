# Deploy no Easypanel

## Problemas Resolvidos

### ✅ SIGTERM Error
- Implementado graceful shutdown
- Tratamento adequado de sinais de terminação
- Timeouts configurados corretamente

### ✅ AWS SDK v2 Deprecated
- Migrado para AWS SDK v3
- Performance melhorada
- Sem mais avisos de deprecação

### ✅ Build TypeScript
- Configuração otimizada do tsconfig.json
- Tipos corretos para AWS SDK v3
- Build funcionando no Docker

## Opções de Deploy

### Opção 1: Dockerfile (Compilação no Container)
```bash
# Use o Dockerfile principal - compila no container
# Melhor para CI/CD automático
```

### Opção 2: Dockerfile.simple (Compilação Local)
```bash
# 1. Compile localmente primeiro
npm run build:verify

# 2. Use o Dockerfile.simple no Easypanel
# Renomeie Dockerfile.simple para Dockerfile
# ou configure o Easypanel para usar Dockerfile.simple
```

## Configurações do Container

### Variáveis de Ambiente Necessárias
```
DATABASE_URL=postgresql://...
PORT=4000
JWT_SECRET=...
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
MINIO_URL=https://...
MINIO_PUBLIC_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=shop
```

### Health Check
- Endpoint: `/health`
- Intervalo: 30s
- Timeout: 3s
- Retries: 3

### Recursos Otimizados
- Memory limit: 512MB (NODE_OPTIONS="--max-old-space-size=512")
- Usuario não-root por segurança
- Build multi-stage otimizado

## Scripts Úteis

```bash
# Build local
npm run build

# Verificar build
npm run verify

# Build + verificação
npm run build:verify

# Build limpo
npm run build:clean

# Deploy completo
./scripts/deploy.sh
```

## Troubleshooting

### Se o build falhar no Docker:
1. **Use Dockerfile.simple**: Compile localmente e use o Dockerfile.simple
2. **Verificar logs**: O Dockerfile principal tem debug detalhado
3. **Build local**: Rode `npm run build:verify` para testar

### Passos para usar Dockerfile.simple:
```bash
# 1. Compile localmente
npm run build:verify

# 2. No Easypanel, renomeie o arquivo:
# Dockerfile.simple → Dockerfile

# 3. Ou configure o Easypanel para usar Dockerfile.simple
```

### Se o container morrer com SIGTERM:
1. Verificar logs do health check
2. Monitorar uso de memória
3. Verificar se o graceful shutdown está funcionando

## Logs Importantes

O servidor agora logga:
- Sinais de terminação recebidos
- Informações de memória no startup
- Status do graceful shutdown
- Health check detalhado

## Recomendação

**Para resolver o erro atual no Easypanel:**

1. **Compile localmente**: `npm run build:verify`
2. **Commit os arquivos compilados** (pasta dist/)
3. **Renomeie Dockerfile.simple para Dockerfile** no seu repositório
4. **Faça o deploy** no Easypanel

Isso deve resolver o problema de compilação no container. 