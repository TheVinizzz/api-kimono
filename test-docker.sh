#!/bin/bash

echo "🐳 Testando Docker da API Kimono..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando. Por favor, inicie o Docker."
    exit 1
fi

# Verificar se a imagem existe
if ! docker images | grep -q "kimono-api"; then
    error "Imagem kimono-api não encontrada. Execute o build primeiro:"
    echo "docker build -f Dockerfile.production -t kimono-api:latest ."
    exit 1
fi

log "Parando containers existentes..."
docker-compose -f docker-compose.test.yml down > /dev/null 2>&1

log "Iniciando containers de teste..."
docker-compose -f docker-compose.test.yml up -d

# Aguardar containers iniciarem
log "Aguardando containers iniciarem..."
sleep 10

# Verificar se containers estão rodando
if ! docker ps | grep -q "kimono-api-test"; then
    error "Container da API não está rodando"
    docker-compose -f docker-compose.test.yml logs kimono-api
    exit 1
fi

if ! docker ps | grep -q "kimono-db-test"; then
    error "Container do banco não está rodando"
    docker-compose -f docker-compose.test.yml logs db
    exit 1
fi

success "Containers iniciados com sucesso!"

# Aguardar API ficar disponível
log "Aguardando API ficar disponível..."
for i in {1..30}; do
    if curl -s -f http://localhost:4000/api/health > /dev/null 2>&1; then
        success "API está respondendo!"
        break
    fi
    if [ $i -eq 30 ]; then
        error "API não respondeu após 30 tentativas"
        log "Logs da API:"
        docker-compose -f docker-compose.test.yml logs kimono-api
        exit 1
    fi
    sleep 2
done

# Testar endpoints
log "Testando endpoints..."

# Health check
log "Testando health check..."
HEALTH_RESPONSE=$(curl -s http://localhost:4000/api/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    success "Health check passou!"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    error "Health check falhou!"
    echo "$HEALTH_RESPONSE"
fi

# Testar rota de produtos (sem autenticação)
log "Testando endpoint de produtos..."
PRODUCTS_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:4000/api/products)
HTTP_CODE="${PRODUCTS_RESPONSE: -3}"
RESPONSE_BODY="${PRODUCTS_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    success "Endpoint de produtos respondeu com sucesso!"
else
    warning "Endpoint de produtos retornou código: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Mostrar logs da API
log "Últimos logs da API:"
docker-compose -f docker-compose.test.yml logs --tail=20 kimono-api

# Mostrar status dos containers
log "Status dos containers:"
docker-compose -f docker-compose.test.yml ps

success "Teste concluído! A API está rodando em http://localhost:4000"
log "Para parar os containers: docker-compose -f docker-compose.test.yml down"
log "Para ver logs em tempo real: docker-compose -f docker-compose.test.yml logs -f" 