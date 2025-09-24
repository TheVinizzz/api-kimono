# 🚀 Deploy no EasyPanel - Guia de Solução de Problemas

## ❌ Problema Identificado
```
ERROR: failed to build: failed to solve: node:20-alpine: failed to resolve source metadata for docker.io/library/node:20-alpine: unexpected status from HEAD request to https://registry-1.docker.io/v2/library/node/manifests/20-alpine: 401 Unauthorized
```

## ✅ Soluções Implementadas

### 1. **Mudança de Base Image**
- **Antes:** `FROM node:20-alpine`
- **Depois:** `FROM node:18-alpine`
- **Motivo:** Node 20 pode ter problemas de autenticação no registry do Docker Hub

### 2. **Otimizações do Dockerfile**
```dockerfile
# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Limpar arquivos desnecessários e reinstalar apenas produção
RUN rm -rf src/ && npm ci --only=production && npm cache clean --force

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node health-check.js || exit 1

# Comando otimizado
CMD ["node", "dist/index.js"]
```

### 3. **Health Check Adicionado**
- Arquivo: `health-check.js`
- Endpoint: `/health` (já existe)
- Verifica conectividade com banco de dados

## 🔧 Configurações Recomendadas no EasyPanel

### **Variáveis de Ambiente Obrigatórias:**
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=seu_jwt_secret
CORS_ORIGIN=https://seu-frontend.com
```

### **Configurações de Build:**
- **Dockerfile Path:** `./Dockerfile`
- **Build Context:** `.`
- **Registry:** Docker Hub (padrão)

## 🚨 Soluções Alternativas se o Problema Persistir

### **Opção 1: Usar Dockerfile Alternativo**
```bash
# Renomear o Dockerfile atual
mv Dockerfile Dockerfile.backup

# Usar o Dockerfile otimizado
mv Dockerfile.easypanel Dockerfile
```

### **Opção 2: Configurar Registry Personalizado**
No EasyPanel, adicionar nas configurações:
```bash
DOCKER_REGISTRY_URL=registry-1.docker.io
DOCKER_REGISTRY_USERNAME=seu_username
DOCKER_REGISTRY_PASSWORD=seu_password
```

### **Opção 3: Usar Imagem Node Oficial**
Alterar no Dockerfile:
```dockerfile
FROM node:18-slim
```

## 📋 Checklist de Deploy

- [ ] ✅ Dockerfile atualizado para Node 18
- [ ] ✅ Health check implementado
- [ ] ✅ Cache de dependências otimizado
- [ ] ✅ Comando de start otimizado
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Banco de dados acessível
- [ ] ✅ Porta 4000 exposta

## 🔍 Troubleshooting

### **Se ainda der erro 401:**
1. Verificar se o EasyPanel tem acesso ao Docker Hub
2. Tentar usar `node:18-slim` ao invés de `node:18-alpine`
3. Configurar registry personalizado

### **Se der erro de build:**
1. Verificar se todas as dependências estão no `package.json`
2. Verificar se o `tsconfig.json` está correto
3. Verificar se o Prisma está configurado

### **Se der erro de runtime:**
1. Verificar variáveis de ambiente
2. Verificar conectividade com banco
3. Verificar logs do container

## 📞 Suporte

Se o problema persistir, verificar:
1. **Logs do EasyPanel** para erros específicos
2. **Status do Docker Hub** (pode estar temporariamente indisponível)
3. **Configurações de rede** do EasyPanel
4. **Limites de rate** do Docker Hub
