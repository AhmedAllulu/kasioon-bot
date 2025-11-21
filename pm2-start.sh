#!/bin/bash

# PM2 Start Script for Kasioon Bot

set -e

echo "🚀 Starting Kasioon Bot with PM2..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f env-config.txt ]; then
        cp env-config.txt .env
        echo -e "${RED}⚠️  Please edit .env file with your actual configuration!${NC}"
    else
        echo -e "${RED}❌ env-config.txt not found!${NC}"
        exit 1
    fi
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed. Installing...${NC}"
    npm install -g pm2
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs uploads

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if kasioon-bot is already running
if pm2 list | grep -q "kasioon-bot"; then
    echo -e "${YELLOW}⚠️  kasioon-bot is already running. Restarting...${NC}"
    pm2 restart kasioon-bot
else
    echo "▶️  Starting kasioon-bot..."
    pm2 start ecosystem.config.js --env production
fi

# Save PM2 process list
pm2 save

# Setup PM2 startup script
echo "🔧 Setting up PM2 startup script..."
pm2 startup systemd -u $USER --hp $HOME

echo ""
echo -e "${GREEN}✅ Kasioon Bot started successfully!${NC}"
echo ""
echo "📊 PM2 Status:"
pm2 list
echo ""
echo "📝 Useful commands:"
echo "  View logs:        pm2 logs kasioon-bot"
echo "  Monitor:          pm2 monit"
echo "  Restart:          pm2 restart kasioon-bot"
echo "  Stop:             pm2 stop kasioon-bot"
echo "  Status:           pm2 status"
echo "  Delete:           pm2 delete kasioon-bot"
echo ""
echo "🌐 API URL: http://localhost:3355"
echo "🏥 Health Check: http://localhost:3355/health"
echo ""

