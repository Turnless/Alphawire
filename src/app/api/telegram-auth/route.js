import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { execute } from '../../../lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/telegram-auth
 * Generates a short-lived unique auth token linked to an EVM wallet address.
 * Returns the Telegram Bot deep-link to trigger connection via Telegram '/start <token>'.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || !address.startsWith('0x')) {
      return NextResponse.json({ success: false, error: 'Invalid EVM wallet address' }, { status: 400 });
    }

    // Generate a secure random alphanumeric token
    const token = crypto.randomBytes(8).toString('hex');

    // Store in database
    await execute(
      'INSERT INTO telegram_auth_tokens (token, wallet_address) VALUES (?, ?)',
      [token, address.toLowerCase()]
    );

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    let botUsername = process.env.TELEGRAM_BOT_USERNAME || 'cinder_wire_bot';

    if (botToken && botToken !== 'your_telegram_bot_token') {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, { signal: AbortSignal.timeout(3000) });
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.result?.username) {
            botUsername = data.result.username;
          }
        }
      } catch (err) {
        console.error('Failed to resolve bot username dynamically:', err);
      }
    }

    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({
      success: true,
      token,
      deepLink
    });
  } catch (error) {
    console.error('Error generating Telegram auth token:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
