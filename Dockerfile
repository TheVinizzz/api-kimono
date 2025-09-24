FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Copiar arquivos de configuração primeiro (para cache de dependências)
COPY package*.json tsconfig.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Gerar Prisma client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Instalar bcryptjs (substituto do bcrypt para Alpine)
RUN npm uninstall bcrypt 2>/dev/null || true && npm install bcryptjs

# Limpar cache npm para reduzir tamanho da imagem
RUN npm cache clean --force

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=4000

# Expor porta
EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["npm", "start"] 