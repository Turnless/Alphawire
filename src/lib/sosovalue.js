/**
 * SoSoValue OpenAPI Client.
 *
 * Base URL: https://openapi.sosovalue.com/openapi/v1
 * Auth:     x-soso-api-key header
 *
 * Verified endpoints (2026-07):
 *   /news                              → news feed (returns { list: [...] })
 *   /etfs?symbol=BTC&country_code=US   → ETF tickers list
 *   /etfs/{ticker}/history             → ETF daily flow history
 *   /currencies/sector-spotlight       → sector + spotlight performance
 *   /indices                           → SSI index names list
 *   /indices/{name}/constituents       → index composition
 */

// Sliding window rate limiter (Beta tier: 20 calls/min)
const requestTimestamps = [];
const LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;
let queuePromise = Promise.resolve();

async function rateLimit() {
  const previousQueue = queuePromise;
  let resolveQueue;
  queuePromise = new Promise(resolve => {
    resolveQueue = resolve;
  });

  await previousQueue;

  try {
    const now = Date.now();
    while (requestTimestamps.length > 0 && requestTimestamps[0] <= now - LIMIT_WINDOW_MS) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length >= MAX_REQUESTS) {
      const oldestTimestamp = requestTimestamps[0];
      const waitTime = oldestTimestamp + LIMIT_WINDOW_MS - now;
      if (waitTime > 0) {
        console.warn(`[SoSoValue Rate Limit] Limit reached. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      const postWaitNow = Date.now();
      while (requestTimestamps.length > 0 && requestTimestamps[0] <= postWaitNow - LIMIT_WINDOW_MS) {
        requestTimestamps.shift();
      }
    }
    requestTimestamps.push(Date.now());
  } finally {
    resolveQueue();
  }
}

/**
 * Core fetch helper with correct auth header and retry logic.
 */
async function fetchFromSoSoValue(endpoint, params = {}) {
  const apiKey = process.env.SOSOVALUE_API_KEY || '';
  const baseUrl = process.env.SOSOVALUE_API_URL || 'https://openapi.sosovalue.com/openapi/v1';

  const url = new URL(`${baseUrl}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const headers = {
    'Accept': 'application/json',
  };
  if (apiKey) {
    headers['x-soso-api-key'] = apiKey;
  }

  const maxAttempts = 3;
  const initialDelay = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await rateLimit();

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // SoSoValue OpenAPI returns code: 0 for success (not 200)
      if (data.code !== undefined && data.code !== 0) {
        throw new Error(data.message || data.msg || `API returned error code ${data.code}`);
      }

      return data.data;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[SoSoValue Client] Request to ${endpoint} failed after ${maxAttempts} attempts:`, error);
        throw error;
      }
      const backoffDelay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`[SoSoValue Client] Request failed (attempt ${attempt}/${maxAttempts}). Retrying in ${backoffDelay}ms... Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}

/**
 * Fetches ETF daily flow history for a given ticker.
 * Uses /etfs/{ticker}/history endpoint.
 * Default ticker: aggregate "ibit" (largest BTC ETF). For ETH pass e.g. "etha".
 *
 * @param {string} asset - 'BTC' or 'ETH' (we map to representative tickers)
 * @param {string|number} [period] - unused (API returns ~20 most recent rows)
 * @returns {Promise<Array>} Raw ETF history rows from the API
 */
export async function getETFFlows(asset, period) {
  // Map asset name to a representative ETF ticker
  const tickerMap = { BTC: 'ibit', ETH: 'etha' };
  const ticker = tickerMap[asset.toUpperCase()] || asset.toLowerCase();

  const rows = await fetchFromSoSoValue(`/etfs/${ticker}/history`);

  // Normalize to match what scheduler/cacheEtfFlows expects
  if (!Array.isArray(rows)) return [];

  return rows.map(row => ({
    date: row.date,
    netFlow: row.net_inflow || 0,
    totalNetAssets: row.net_assets || 0,
    details: {
      ticker: row.ticker,
      cum_inflow: row.cum_inflow,
      currency_share: row.currency_share,
      prem_dsc: row.prem_dsc,
      value_traded: row.value_traded,
      volume: row.volume,
    }
  }));
}

/**
 * Alias for getETFFlows (kept for backward compatibility).
 */
export async function getETFHistorical(asset, days = 7) {
  return getETFFlows(asset, days);
}

/**
 * Fetches AI-curated crypto news.
 * Uses /news endpoint. Returns data.list array.
 *
 * @param {number} [limit=20] - Max items
 * @param {number} [offset=0] - Pagination offset
 * @returns {Promise<Array>} Normalized news items
 */
export async function getAINewsFeed(limit = 20, offset = 0) {
  const data = await fetchFromSoSoValue('/news', {
    page: Math.floor(offset / limit) + 1,
    page_size: limit,
  });

  // /news returns { list: [...], page, page_size, total }
  const list = data?.list || data;
  if (!Array.isArray(list)) return [];

  return list.slice(0, limit).map(item => ({
    id: item.id,
    title: item.title || (item.content ? item.content.substring(0, 80) : 'Untitled'),
    summary: item.content || null,
    source: item.author || 'SoSoValue',
    keywords: item.tags || [],
    sentiment: null,  // API doesn't provide sentiment scores
    publishedAt: item.release_time
      ? new Date(Number(item.release_time)).toISOString()
      : new Date().toISOString(),
    sourceLink: item.source_link || item.original_link || null,
    matchedCurrencies: item.matched_currencies || [],
  }));
}

/**
 * Fetches sector performance data.
 * Uses /currencies/sector-spotlight endpoint.
 *
 * @returns {Promise<Array>} Normalized sector items with change_pct_24h
 */
export async function getSectorPerformance() {
  const data = await fetchFromSoSoValue('/currencies/sector-spotlight');

  if (!data || !data.sector) return [];

  // Combine main sectors and spotlight into a single array
  const sectors = data.sector.map(s => ({
    indexName: s.name,
    displayName: s.name,
    performance7d: s.change_pct_24h || 0,   // 24h change (best available)
    performance30d: s.change_pct_24h || 0,   // duplicate for now
    correlationToBtc: s.marketcap_dom || 0,
    tokens: [],
  }));

  return sectors;
}

/**
 * Fetches SSI index names list.
 * Uses /indices endpoint.
 *
 * @returns {Promise<Array<string>>} List of index names like "ssiAI", "ssiDeFi"
 */
export async function getIndexList() {
  return fetchFromSoSoValue('/indices');
}

/**
 * Fetches composition of a specific sector index.
 * Uses /indices/{name}/constituents endpoint.
 *
 * @param {string} indexName - e.g., 'ssiAI'
 * @returns {Promise<Object>} Index constituents and weights
 */
export async function getSectorComposition(indexName) {
  const constituents = await fetchFromSoSoValue(`/indices/${indexName}/constituents`);
  return {
    indexName,
    tokens: Array.isArray(constituents) ? constituents : [],
  };
}

/**
 * Fetches ETF ticker list for an asset.
 * Uses /etfs?symbol=BTC&country_code=US endpoint.
 *
 * @param {string} symbol - 'BTC' or 'ETH'
 * @param {string} countryCode - 'US', 'HK', etc.
 * @returns {Promise<Array>} ETF tickers
 */
export async function getETFList(symbol = 'BTC', countryCode = 'US') {
  return fetchFromSoSoValue('/etfs', { symbol, country_code: countryCode });
}

/**
 * Fetches raw live sector and spotlight performance data from SoSoValue.
 */
export async function getLiveMarketUpdate() {
  const data = await fetchFromSoSoValue('/currencies/sector-spotlight');
  return {
    sectors: data?.sector || [],
    spotlight: data?.spotlight || [],
    fetchedAt: new Date().toISOString()
  };
}

/**
 * getCoinData is not available on the OpenAPI — stub that returns null.
 */
export async function getCoinData(symbol) {
  console.warn(`[SoSoValue] getCoinData('${symbol}') is not available on the OpenAPI. Returning null.`);
  return null;
}
