#!/bin/bash

# Kasioon Bot Deployment Script
# This script automates the deployment process

set -e

echo "🚀 Starting Kasioon Bot Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.template .env
    echo -e "${RED}⚠️  Please edit .env file with your actual configuration before continuing!${NC}"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs uploads n8n/workflows nginx/ssl

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check API
if curl -f http://localhost:3355/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${RED}❌ API is not responding${NC}"
fi

# Check n8n
if curl -f http://localhost:5678 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ n8n is healthy${NC}"
else
    echo -e "${RED}❌ n8n is not responding${NC}"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
fi

# Display service URLs
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Service URLs:"
echo "  📊 API: http://localhost:3355"
echo "  🔧 n8n: http://localhost:5678"
echo "  📮 Redis: localhost:6379"
echo ""
echo "Webhook URLs (update in Telegram/WhatsApp):"
echo "  📱 Telegram: http://chato-app.com/api/telegram/webhook"
echo "  💬 WhatsApp: http://chato-app.com/api/whatsapp/webhook"
echo ""
echo "📝 Next steps:"
echo "  1. Configure your Telegram bot webhook"
echo "  2. Configure your WhatsApp webhook"
echo "  3. Set up n8n workflows at http://localhost:5678"
echo "  4. Monitor logs with: docker-compose logs -f"
echo ""

