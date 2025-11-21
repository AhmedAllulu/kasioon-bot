#!/bin/bash

# PM2 Stop Script for Kasioon Bot

set -e

echo "🛑 Stopping Kasioon Bot..."

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
    echo "Stopping kasioon-bot..."
    pm2 stop kasioon-bot
    pm2 save
    echo -e "${GREEN}✅ Kasioon Bot stopped successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  kasioon-bot is not running.${NC}"
fi

echo ""
echo "📊 PM2 Status:"
pm2 list

