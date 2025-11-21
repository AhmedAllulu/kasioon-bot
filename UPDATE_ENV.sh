#!/bin/bash

# Script to update .env file with Kasioon API URL

echo "🔧 Updating Kasioon API Configuration..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    if [ -f env-config.txt ]; then
        cp env-config.txt .env
    else
        echo "❌ env-config.txt not found!"
        exit 1
    fi
fi

# Get current API URL
CURRENT_URL=$(grep "^KASIOON_API_URL=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

echo "Current KASIOON_API_URL: ${CURRENT_URL:-'Not set'}"
echo ""

# Ask user for API URL
read -p "Enter your Kasioon API URL (e.g., http://localhost:3850 or http://your-domain.com:3850): " API_URL

if [ -z "$API_URL" ]; then
    echo "⚠️  No URL provided, using default: http://localhost:3850"
    API_URL="http://localhost:3850"
fi

# Remove trailing slash
API_URL=$(echo "$API_URL" | sed 's|/$||')

# Remove /api paths if present
API_URL=$(echo "$API_URL" | sed 's|/api/.*$||')

# Update .env file
if grep -q "^KASIOON_API_URL=" .env; then
    # Update existing
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^KASIOON_API_URL=.*|KASIOON_API_URL=$API_URL|" .env
    else
        # Linux
        sed -i "s|^KASIOON_API_URL=.*|KASIOON_API_URL=$API_URL|" .env
    fi
    echo "✅ Updated KASIOON_API_URL in .env"
else
    # Add new
    echo "" >> .env
    echo "# Kasioon Marketplace API Configuration" >> .env
    echo "KASIOON_API_URL=$API_URL" >> .env
    echo "✅ Added KASIOON_API_URL to .env"
fi

echo ""
echo "📋 Updated configuration:"
grep "^KASIOON_API_URL=" .env
echo ""
echo "🔄 Restart the bot to apply changes:"
echo "   pm2 restart kasioon-bot"

