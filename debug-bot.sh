#!/bin/bash

# Debug script for Telegram bot

echo "🔍 Debugging Kasioon Bot..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating from template..."
    if [ -f env-config.txt ]; then
        cp env-config.txt .env
        echo "✅ Created .env file. Please update it with your credentials."
    else
        echo "❌ env-config.txt not found!"
        exit 1
    fi
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📋 Environment Check:"
echo "===================="
echo "TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN:0:20}..." 
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "  ❌ NOT SET"
else
    echo "  ✅ Set"
fi

echo "PORT: ${PORT:-3355}"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo ""

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    echo "📊 PM2 Status:"
    pm2 list | grep kasioon-bot || echo "  ⚠️  kasioon-bot not running in PM2"
    echo ""
fi

# Test Telegram API
if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "🧪 Testing Telegram Bot API:"
    echo "===================="
    
    # Get bot info
    BOT_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe")
    
    if echo "$BOT_INFO" | grep -q '"ok":true'; then
        echo "✅ Bot token is valid"
        echo "Bot info:"
        echo "$BOT_INFO" | jq '.result | {username, first_name, id}' 2>/dev/null || echo "$BOT_INFO"
    else
        echo "❌ Bot token is invalid or bot not found"
        echo "Response: $BOT_INFO"
    fi
    
    echo ""
    
    # Check webhook
    echo "🔗 Webhook Status:"
    WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
    echo "$WEBHOOK_INFO" | jq '.' 2>/dev/null || echo "$WEBHOOK_INFO"
    echo ""
fi

# Check if server is running
echo "🌐 Server Status:"
echo "===================="
if curl -s http://localhost:3355/health > /dev/null 2>&1; then
    echo "✅ Server is running on port 3355"
    curl -s http://localhost:3355/health | jq '.' 2>/dev/null || curl -s http://localhost:3355/health
else
    echo "❌ Server is not responding on port 3355"
    echo "   Make sure the server is running: ./pm2-start.sh"
fi
echo ""

# Check logs
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q kasioon-bot; then
        echo "📝 Recent Logs (last 20 lines):"
        echo "===================="
        pm2 logs kasioon-bot --lines 20 --nostream
    fi
fi

echo ""
echo "💡 Tips:"
echo "  - If bot token is invalid, check your .env file"
echo "  - If webhook is set, you might need to delete it for polling mode"
echo "  - Check PM2 logs: pm2 logs kasioon-bot"
echo "  - Restart bot: pm2 restart kasioon-bot"

