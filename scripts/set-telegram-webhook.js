const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const firstEquals = trimmed.indexOf('=');
        if (firstEquals !== -1) {
          const key = trimmed.slice(0, firstEquals).trim();
          let value = trimmed.slice(firstEquals + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {}

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.argv[2];

if (!token || token === 'your_telegram_bot_token') {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN is not configured in .env');
  process.exit(1);
}

if (!appUrl) {
  console.error('❌ Error: Please provide your public application URL (e.g., https://your-app.railway.app or ngrok URL)');
  console.log('   Usage: node scripts/set-telegram-webhook.js <YOUR_URL>');
  process.exit(1);
}

const cleanedUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
const webhookUrl = `${cleanedUrl}/api/webhook`;

async function register() {
  console.log(`🔌 Registering Telegram webhook URL: ${webhookUrl}`);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: token
      })
    });
    const data = await res.json();
    if (data.ok) {
      console.log('✅ Webhook successfully set up on Telegram!');
    } else {
      console.error('❌ Failed to set webhook:', data.description);
    }
  } catch (err) {
    console.error('❌ Network error setting webhook:', err);
  }
}

register();
