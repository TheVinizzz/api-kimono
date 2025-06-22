FROM node:18-alpine

WORKDIR /app

# Instalar dependências necessárias para compilação
RUN apk add --no-cache python3 make g++ git

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências exceto bcrypt
RUN npm ci --omit=dev --ignore-scripts

# Copiar o restante dos arquivos
COPY . .

# Instalar bcrypt de maneira compatível
RUN npm uninstall bcrypt && npm install bcryptjs

# Gerar os artefatos do Prisma
RUN npx prisma generate

# Compilar TypeScript para JavaScript com outDir explícito
RUN mkdir -p dist && npx tsc --outDir dist

# Expor a porta da aplicação
EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["npm", "start"] 