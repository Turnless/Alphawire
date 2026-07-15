import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route.js';
import { execute } from '../../../../lib/db.js';

vi.mock('../../../../lib/db.js', () => ({
  execute: vi.fn()
}));

describe('POST /api/telegram-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_USERNAME = 'cinder_wire_bot';
  });

  it('fails if address is missing or invalid', async () => {
    const req = {
      json: async () => ({})
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid EVM wallet address');
  });

  it('generates a token and returns deep link on valid address', async () => {
    const address = '0x1234567890123456789012345678901234567890';
    const req = {
      json: async () => ({ address })
    };
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.deepLink).toContain('https://t.me/cinder_wire_bot?start=');
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO telegram_auth_tokens'),
      [data.token, address.toLowerCase()]
    );
  });
});
