#!/bin/bash

# PM2 Restart Script for Kasioon Bot

set -e

echo "🔄 Restarting Kasioon Bot..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 is not installed.${NC}"
    exit 1
fi

# Check if kasioon-bot is running
if pm2 list | grep -q "kasioon-bot"; then
    echo "Restarting kasioon-bot..."
    pm2 restart kasioon-bot
    echo -e "${GREEN}✅ Kasioon Bot restarted successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  kasioon-bot is not running. Starting...${NC}"
    pm2 start ecosystem.config.js --env production
    pm2 save
fi

echo ""
echo "📊 PM2 Status:"
pm2 list
echo ""
echo "📝 View logs: pm2 logs kasioon-bot"

