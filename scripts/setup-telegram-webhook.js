#!/usr/bin/env node

/**
 * Telegram Webhook Setup Script
 *
 * This script configures the Telegram bot webhook to point to your server.
 * Run this script after deploying your server to set up the webhook.
 *
 * Usage:
 *   node scripts/setup-telegram-webhook.js
 */

require('dotenv').config();
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = `${process.env.KASIOON_API_URL}/api/webhooks/telegram`;

async function setupWebhook() {
  console.log('🤖 Telegram Webhook Setup\n');

  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN not found in environment variables');
    process.exit(1);
  }

  if (!process.env.KASIOON_API_URL) {
    console.error('❌ Error: KASIOON_API_URL not found in environment variables');
    process.exit(1);
  }

  console.log(`📡 Setting webhook to: ${WEBHOOK_URL}\n`);

  try {
    // Get current webhook info
    console.log('1️⃣ Checking current webhook...');
    const webhookInfo = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );

    console.log('Current webhook:', webhookInfo.data.result.url || 'None');
    console.log('Pending updates:', webhookInfo.data.result.pending_update_count);

    if (webhookInfo.data.result.last_error_message) {
      console.log('⚠️  Last error:', webhookInfo.data.result.last_error_message);
    }

    console.log('');

    // Delete existing webhook
    console.log('2️⃣ Deleting existing webhook...');
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      { drop_pending_updates: false }
    );
    console.log('✅ Webhook deleted\n');

    // Set new webhook
    console.log('3️⃣ Setting new webhook...');
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false
      }
    );

    if (response.data.ok) {
      console.log('✅ Webhook set successfully!\n');
    } else {
      console.error('❌ Failed to set webhook:', response.data.description);
      process.exit(1);
    }

    // Get bot info
    console.log('4️⃣ Getting bot info...');
    const botInfo = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );

    console.log('Bot username:', `@${botInfo.data.result.username}`);
    console.log('Bot name:', botInfo.data.result.first_name);
    console.log('Bot ID:', botInfo.data.result.id);
    console.log('');

    // Verify webhook
    console.log('5️⃣ Verifying webhook...');
    const verifyInfo = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );

    console.log('✅ Webhook URL:', verifyInfo.data.result.url);
    console.log('Pending updates:', verifyInfo.data.result.pending_update_count);
    console.log('Max connections:', verifyInfo.data.result.max_connections || 40);

    if (verifyInfo.data.result.last_error_message) {
      console.log('⚠️  Last error:', verifyInfo.data.result.last_error_message);
      console.log('Error date:', new Date(verifyInfo.data.result.last_error_date * 1000));
    }

    console.log('\n🎉 Telegram webhook setup complete!');
    console.log(`\n📱 You can now chat with your bot at: https://t.me/${botInfo.data.result.username}`);

  } catch (error) {
    console.error('\n❌ Error setting up webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the setup
setupWebhook();
