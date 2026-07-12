import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ethers } from 'ethers';
import {
  getDomain,
  getOrderSignatureHeaders,
  getTicker,
  getOrderBook,
  getKlines,
  getMarkets,
  placeOrder,
  cancelOrder,
  getAccountState,
  getOpenOrders,
  getTradeHistory,
  getApiKeys,
  fetchAccountBalances
} from '../sodex.js';

describe('SoDEX API Client & EIP-712 Signer', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.SODEX_API_BASE_URL = 'https://testnet-gw.sodex.dev/api/v1/spot';
    process.env.SODEX_API_KEY_PRIVATE_KEY = ethers.Wallet.createRandom().privateKey;
    process.env.SODEX_API_KEY_NAME = 'test-api-key-name';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('getDomain', () => {
    it('returns the correct EIP-712 domain structure for spot testnet', () => {
      const domain = getDomain('spot', false);
      expect(domain).toEqual({
        name: 'spot',
        version: '1',
        chainId: 138565,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      });
    });

    it('returns the correct EIP-712 domain structure for spot mainnet', () => {
      const domain = getDomain('spot', true);
      expect(domain).toEqual({
        name: 'spot',
        version: '1',
        chainId: 286623,
        verifyingContract: '0x0000000000000000000000000000000000000000'
      });
    });

    it('returns the correct EIP-712 domain structure for futures testnet', () => {
      const domain = getDomain('futures', false);
      expect(domain.name).toBe('futures');
      expect(domain.chainId).toBe(138565);
    });

    it('defaults market to spot if undefined', () => {
      const domain = getDomain(undefined, false);
      expect(domain.name).toBe('spot');
    });
  });

  describe('getOrderSignatureHeaders', () => {
    it('throws error if apiKeyPrivateKey is missing', async () => {
      await expect(
        getOrderSignatureHeaders('newOrder', {}, null, 'api-key', 'spot', false)
      ).rejects.toThrow('API private key is required for EIP-712 signing');
    });

    it('throws error if apiKeyName is missing', async () => {
      const key = ethers.Wallet.createRandom().privateKey;
      await expect(
        getOrderSignatureHeaders('newOrder', {}, key, null, 'spot', false)
      ).rejects.toThrow('API key name is required for signature headers');
    });

    it('correctly hashes and signs newOrder parameters using the API key private key', async () => {
      const apiKeyWallet = ethers.Wallet.createRandom();
      const masterWallet = ethers.Wallet.createRandom();
      const apiKeyPrivateKey = apiKeyWallet.privateKey;
      const apiKeyName = 'key-123';

      const orderParams = {
        pair: 'BTC-USDC',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: 0.05,
        price: 0,
        stopPrice: null,
        funds: undefined
      };

      const headers = await getOrderSignatureHeaders(
        'newOrder',
        orderParams,
        apiKeyPrivateKey,
        apiKeyName,
        'spot',
        false
      );

      expect(headers['X-API-Key']).toBe(apiKeyName);
      expect(headers['X-API-Nonce']).toBeDefined();
      expect(headers['X-API-Sign']).toMatch(/^0x01[a-fA-F0-9]+/);

      // Verify that recovering the signature points to the API key wallet address
      const signaturePrefixed = headers['X-API-Sign'];
      const rawSignature = '0x' + signaturePrefixed.substring(4); // Strip 0x01 prefix
      const nonce = Number(headers['X-API-Nonce']);

      // Expected clean params mapping for newOrder
      const expectedCleaned = {
        pair: 'BTC-USDC',
        side: 'BUY',
        orderType: 'MARKET',
        quantity: '0.05',
        price: '0'
      };

      const payloadJson = JSON.stringify({ type: 'newOrder', params: expectedCleaned });
      const payloadHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(payloadJson));

      const TYPES = {
        ExchangeAction: [
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' }
        ]
      };
      const domain = getDomain('spot', false);

      const recoveredAddress = ethers.utils.verifyTypedData(
        domain,
        TYPES,
        { payloadHash, nonce },
        rawSignature
      );

      // Signature MUST match the API key's wallet address, NOT the master wallet
      expect(recoveredAddress).toBe(apiKeyWallet.address);
      expect(recoveredAddress).not.toBe(masterWallet.address);
    });

    it('correctly handles parameters and hashing for cancelOrder', async () => {
      const apiKeyWallet = ethers.Wallet.createRandom();
      const apiKeyPrivateKey = apiKeyWallet.privateKey;
      const apiKeyName = 'key-cancel';

      const cancelParams = {
        orderId: 98765
      };

      const headers = await getOrderSignatureHeaders(
        'cancelOrder',
        cancelParams,
        apiKeyPrivateKey,
        apiKeyName,
        'spot',
        true
      );

      const signaturePrefixed = headers['X-API-Sign'];
      const rawSignature = '0x' + signaturePrefixed.substring(4);
      const nonce = Number(headers['X-API-Nonce']);

      const expectedCleaned = {
        orderId: '98765'
      };

      const payloadJson = JSON.stringify({ type: 'cancelOrder', params: expectedCleaned });
      const payloadHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(payloadJson));

      const TYPES = {
        ExchangeAction: [
          { name: 'payloadHash', type: 'bytes32' },
          { name: 'nonce', type: 'uint64' }
        ]
      };
      const domain = getDomain('spot', true);

      const recoveredAddress = ethers.utils.verifyTypedData(
        domain,
        TYPES,
        { payloadHash, nonce },
        rawSignature
      );

      expect(recoveredAddress).toBe(apiKeyWallet.address);
    });
  });

  describe('REST Endpoints (Public)', () => {
    it('getTicker constructs the correct public url', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { price: '65000.00', pair: 'BTC-USDC' } })
      });

      const data = await getTicker('BTC-USDC');
      expect(fetch).toHaveBeenCalledWith(
        'https://testnet-gw.sodex.dev/api/v1/spot/ticker?pair=BTC-USDC',
        expect.objectContaining({ method: 'GET' })
      );
      expect(data.price).toBe('65000.00');
    });

    it('getOrderBook constructs correct url with depth', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { bids: [], asks: [] } })
      });

      await getOrderBook('BTC-USDC', 10);
      expect(fetch).toHaveBeenCalledWith(
        'https://testnet-gw.sodex.dev/api/v1/spot/orderbook?pair=BTC-USDC&depth=10',
        expect.any(Object)
      );
    });

    it('getKlines constructs correct url', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: [] })
      });

      await getKlines('BTC-USDC', '1h');
      expect(fetch).toHaveBeenCalledWith(
        'https://testnet-gw.sodex.dev/api/v1/spot/klines?pair=BTC-USDC&interval=1h',
        expect.any(Object)
      );
    });

    it('getMarkets constructs correct url', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: ['BTC-USDC', 'ETH-USDC'] })
      });

      await getMarkets('futures');
      expect(fetch).toHaveBeenCalledWith(
        'https://testnet-gw.sodex.dev/api/v1/futures/markets',
        expect.any(Object)
      );
    });
  });

  describe('REST Endpoints (Signed / Private)', () => {
    it('placeOrder places signed POST request and returns order execution data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { orderId: 'ord-111', status: 'FILLED' } })
      });

      const orderParams = { pair: 'ETH-USDC', side: 'BUY', orderType: 'MARKET', quantity: '1.2' };
      const res = await placeOrder(orderParams);

      expect(fetch).toHaveBeenCalledWith(
        'https://testnet-gw.sodex.dev/api/v1/spot/trade/orders',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(orderParams),
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key-name',
            'X-API-Nonce': expect.any(String),
            'X-API-Sign': expect.any(String),
            'Content-Type': 'application/json'
          })
        })
      );
      expect(res.orderId).toBe('ord-111');
      expect(res.status).toBe('FILLED');
    });

    it('cancelOrder sends signed DELETE request with correct query params', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: { orderId: 'ord-111', status: 'CANCELLED' } })
      });

      const res = await cancelOrder('ord-111');
      expect(fetch).toHaveBeenCalledWith(
        'https://testnet-gw.sodex.dev/api/v1/spot/trade/orders/ord-111',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key-name',
            'X-API-Nonce': expect.any(String),
            'X-API-Sign': expect.any(String)
          })
        })
      );
      expect(res.status).toBe('CANCELLED');
    });

    it('getAccountState retrieves user account info and balance state', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 200,
          data: {
            accountId: 'acc-999',
            walletAddress: mockAddress,
            balances: [
              { asset: 'USDC', free: '500.00', locked: '0.00' },
              { asset: 'BTC', free: '0.10', locked: '0.02' }
            ]
          }
        })
      });

      const state = await getAccountState(mockAddress);
      expect(fetch).toHaveBeenCalledWith(
        `https://testnet-gw.sodex.dev/api/v1/spot/accounts/${mockAddress}/state`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key-name'
          })
        })
      );
      expect(state.accountId).toBe('acc-999');
      expect(state.balances).toHaveLength(2);
    });

    it('getOpenOrders retrieves pending open orders list', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: [] })
      });

      await getOpenOrders(mockAddress);
      expect(fetch).toHaveBeenCalledWith(
        `https://testnet-gw.sodex.dev/api/v1/spot/accounts/${mockAddress}/open-orders`,
        expect.any(Object)
      );
    });

    it('getTradeHistory retrieves transaction trade history with limit', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: [] })
      });

      await getTradeHistory(mockAddress, 10);
      expect(fetch).toHaveBeenCalledWith(
        `https://testnet-gw.sodex.dev/api/v1/spot/accounts/${mockAddress}/trades?limit=10`,
        expect.any(Object)
      );
    });

    it('getApiKeys retrieves registered api keys', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 200, data: ['key-1', 'key-2'] })
      });

      await getApiKeys(mockAddress);
      expect(fetch).toHaveBeenCalledWith(
        `https://testnet-gw.sodex.dev/api/v1/spot/accounts/${mockAddress}/api-keys`,
        expect.any(Object)
      );
    });

    it('fetchAccountBalances gets and maps balance details', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 200,
          data: {
            balances: [{ asset: 'USDC', free: '1000' }]
          }
        })
      });

      const balances = await fetchAccountBalances(mockAddress);
      expect(balances).toEqual([{ asset: 'USDC', free: '1000' }]);
    });
  });
});
