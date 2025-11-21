#!/bin/bash

# Telegram Bot Setup Script

set -e

echo "📱 Setting up Telegram Bot..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN is not set in .env file!"
    exit 1
fi

# Get webhook URL from user
read -p "Enter your webhook URL (e.g., https://your-domain.com/api/telegram/webhook): " WEBHOOK_URL

if [ -z "$WEBHOOK_URL" ]; then
    echo "❌ Webhook URL is required!"
    exit 1
fi

# Set webhook
echo "Setting webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${WEBHOOK_URL}\"}")

echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook set successfully!"
    
    # Get webhook info
    echo ""
    echo "Current webhook info:"
    curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo" | jq .
else
    echo "❌ Failed to set webhook!"
    exit 1
fi

