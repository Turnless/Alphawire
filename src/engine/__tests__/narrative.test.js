import { vi, describe, it, expect, beforeEach } from 'vitest';
import { calculateNarrativeTemperature, getDominantNarrative, updateNarrativeTemperatures, NARRATIVES } from '../narrative.js';
import { query, execute } from '../../lib/db.js';

// Mock the db.js module
vi.mock('../../lib/db.js', () => {
  return {
    query: vi.fn(),
    execute: vi.fn()
  };
});

describe('Narrative Scoring Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateNarrativeTemperature', () => {
    it('throws error for unknown narrative ID', async () => {
      await expect(calculateNarrativeTemperature('NAR_INVALID')).rejects.toThrow('Narrative archetype not found: NAR_INVALID');
    });

    it('calculates temperature correctly when all sub-scores are positive (NAR_01)', async () => {
      // Mock data for NAR_01: expectedFlowPattern = inflow, expectedLeader = BTC, expectedSentiment = positive
      const mockNews24h = [
        {
          title: 'Institutional interest grows in Bitcoin ETF',
          summary: 'Bitcoin ETFs are seeing record adoption.',
          keywords: JSON.stringify(['ETF', 'adoption']),
          sentiment: 0.8,
          fetched_at: new Date().toISOString()
        },
        {
          title: 'Retail buyers show caution',
          summary: 'Market remains stable.',
          keywords: JSON.stringify(['caution']),
          sentiment: 0.1,
          fetched_at: new Date().toISOString()
        }
      ];

      const now = new Date();
      const mockNews30d = Array.from({ length: 30 }, (_, i) => {
        const daysAgo = i === 29 ? 30 : i;
        const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        return {
          title: 'ETF and adoption news',
          summary: 'Institutional narrative',
          keywords: JSON.stringify(['ETF', 'adoption']),
          sentiment: 0.5,
          fetched_at: date.toISOString()
        };
      });

      const mockEtfFlows = Array.from({ length: 7 }, () => ({ net_flow: 250000000 })); // 250M avg flow

      const mockSectorData = [
        { sector: 'BTC.ssi', performance_7d: 0.05, performance_30d: 0.1, correlation_btc: 1.0 },
        { sector: 'DeFi.ssi', performance_7d: 0.02, performance_30d: 0.05, correlation_btc: 0.8 }
      ];

      query.mockImplementation(async (sql, params) => {
        if (sql.includes('news_items') && sql.includes('-24 hours')) {
          return mockNews24h;
        }
        if (sql.includes('news_items') && sql.includes('-30 days')) {
          return mockNews30d;
        }
        if (sql.includes('etf_flows')) {
          return mockEtfFlows;
        }
        if (sql.includes('sector_data')) {
          return mockSectorData;
        }
        return [];
      });

      const result = await calculateNarrativeTemperature('NAR_01');

      // Let's verify each sub-score logic
      // News score:
      // keywords_present (matches for NAR_01 keywords: institutional, ETF, adoption)
      // item 1 has: title contains 'institutional', keywords contains 'ETF', 'adoption'. Matches = true.
      // item 2 has: matches = false.
      // So keywords_present = 1, matchingNewsCount = 1, matchingNewsSentimentSum = 0.8. avg sentiment = 0.8 (positive).
      // expectedSentiment = positive -> sentiment_alignment = 1.0.
      // news30d length = 30. All match keywords. So total_keywords_30d = 30.
      // daysDifference = oldest is 29 days ago -> ceil(ms/day) = 30 days.
      // keywords_baseline = 30 / 30 = 1.
      // keyword_ratio = 1 / 1 = 1.
      // newsScore = Math.min(100, keyword_ratio * 50 * sentiment_alignment) = Math.min(100, 1 * 50 * 1.0) = 50.0.
      expect(result.newsScore).toBe(50.0);

      // Flow score:
      // avgFlow = 250,000,000. pattern = inflow. avgFlow >= 200M -> flowScore = 100.
      expect(result.flowScore).toBe(100.0);

      // Sector score:
      // Leader sector is 'BTC.ssi', which matches expectedLeader 'BTC'.
      // leaderReturn = 0.05, runnerUpReturn = 0.02. outperformance = (0.05 - 0.02) * 100 = 3.
      // sectorScore = Math.min(100, 80 + 3 * 4) = 92.0.
      expect(result.sectorScore).toBe(92.0);

      // Combined temp: 0.40 * 50.0 + 0.35 * 100.0 + 0.25 * 92.0 = 20.0 + 35.0 + 23.0 = 78.0
      expect(result.temperature).toBe(78.0);
    });

    it('calculates alternative flow patterns correctly', async () => {
      // Test different expectedFlowPattern outcomes
      // For NAR_02: accelerating_inflow
      const mockNews24h = [];
      const mockNews30d = [];
      // flow patterns
      // 7 days of flows: oldest to newest [10M, 20M, 30M, 40M, 50M, 60M, 70M]
      // older = [10M, 20M, 30M] (avg = 20M)
      // recent = [50M, 60M, 70M] (avg = 60M)
      // diff = 40M. flowScore = min(100, (40M / 100M) * 100) = 40.
      const mockEtfFlows = [
        { net_flow: 10_000_000 },
        { net_flow: 20_000_000 },
        { net_flow: 30_000_000 },
        { net_flow: 40_000_000 },
        { net_flow: 50_000_000 },
        { net_flow: 60_000_000 },
        { net_flow: 70_000_000 }
      ].reverse(); // reverse so oldest to newest when mapping is reversed in narrative.js

      const mockSectorData = [];

      query.mockImplementation(async (sql, params) => {
        if (sql.includes('news_items')) return [];
        if (sql.includes('etf_flows')) return mockEtfFlows;
        if (sql.includes('sector_data')) return mockSectorData;
        return [];
      });

      const result = await calculateNarrativeTemperature('NAR_02');
      expect(result.newsScore).toBe(0.0);
      expect(result.flowScore).toBe(40.0);
    });

    it('handles negative flows and sentiment mismatch correctly', async () => {
      // For NAR_03: regulatory storm (expected sentiment negative, expected leader Stablecoin, flow pattern outflow)
      // Sentiment mismatch (positive instead of negative)
      const mockNews24h = [
        {
          title: 'Positive regulatory clarity',
          summary: 'Compliance rules are clear now.',
          keywords: JSON.stringify(['compliance']),
          sentiment: 0.8,
          fetched_at: new Date().toISOString()
        }
      ];

      const now = new Date();
      const mockNews30d = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        return {
          title: 'regulation compliance news',
          summary: 'regulations',
          keywords: JSON.stringify(['regulation']),
          sentiment: -0.2,
          fetched_at: date.toISOString()
        };
      });

      // expectedFlowPattern: outflow
      // avgFlow = -50,000,000 -> flowScore = Math.min(100, (50,000,000 / 100,000,000) * 100) = 50.0
      const mockEtfFlows = Array.from({ length: 7 }, () => ({ net_flow: -50000000 }));

      // expectedLeader: Stablecoin
      // sector leader is BTC, stablecoin is rank 1 (second)
      const mockSectorData = [
        { sector: 'BTC', performance_7d: 0.05 },
        { sector: 'Stablecoin', performance_7d: 0.01 }
      ];

      query.mockImplementation(async (sql, params) => {
        if (sql.includes('news_items') && sql.includes('-24 hours')) {
          return mockNews24h;
        }
        if (sql.includes('news_items') && sql.includes('-30 days')) {
          return mockNews30d;
        }
        if (sql.includes('etf_flows')) {
          return mockEtfFlows;
        }
        if (sql.includes('sector_data')) {
          return mockSectorData;
        }
        return [];
      });

      const result = await calculateNarrativeTemperature('NAR_03');

      // averageSentiment = 0.8. Expected is negative. sentiment_alignment = 0.0.
      expect(result.newsScore).toBe(0.0);
      expect(result.flowScore).toBe(50.0);
      // Sector score: Stablecoin is rank 1. sectorScore = Math.max(0, 50 - 1 * 15) = 35.0.
      expect(result.sectorScore).toBe(35.0);
      // temperature: 0.4*0 + 0.35*50 + 0.25*35 = 17.5 + 8.75 = 26.25
      expect(result.temperature).toBe(26.25);
    });
  });

  describe('getDominantNarrative', () => {
    it('returns dominant narrative from database records', async () => {
      const mockHistory = [
        { narrative_id: 'NAR_04', avg_temp: 78.5 },
        { narrative_id: 'NAR_01', avg_temp: 50.0 }
      ];

      query.mockResolvedValueOnce(mockHistory);

      const dominant = await getDominantNarrative();
      expect(dominant.id).toBe('NAR_04');
      expect(dominant.name).toBe(NARRATIVES['NAR_04'].name);
      expect(dominant.temperature).toBe(78.5);
    });

    it('falls back to NAR_01 if database query returns no records', async () => {
      query.mockResolvedValueOnce([]);

      const dominant = await getDominantNarrative();
      expect(dominant.id).toBe('NAR_01');
      expect(dominant.name).toBe(NARRATIVES['NAR_01'].name);
      expect(dominant.temperature).toBe(50.0);
    });

    it('falls back to NAR_01 if database query fails', async () => {
      query.mockRejectedValueOnce(new Error('DB failure'));

      const dominant = await getDominantNarrative();
      expect(dominant.id).toBe('NAR_01');
      expect(dominant.name).toBe(NARRATIVES['NAR_01'].name);
      expect(dominant.temperature).toBe(50.0);
    });
  });

  describe('updateNarrativeTemperatures', () => {
    it('calculates and stores temperatures for all narratives', async () => {
      query.mockResolvedValue([]);
      execute.mockResolvedValue({ rowsAffected: 1, lastInsertRowid: 1 });

      const result = await updateNarrativeTemperatures();
      
      expect(Object.keys(result).length).toBe(Object.keys(NARRATIVES).length);
      expect(execute).toHaveBeenCalledTimes(Object.keys(NARRATIVES).length);
      for (const narId of Object.keys(NARRATIVES)) {
        expect(result[narId]).toBeDefined();
      }
    });
  });
});
