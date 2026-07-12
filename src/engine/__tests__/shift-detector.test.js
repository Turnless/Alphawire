import { vi, describe, it, expect, beforeEach } from 'vitest';
import { detectShift, countAgreeingSignals, calculateConfidence } from '../shift-detector.js';
import { query } from '../../lib/db.js';
import { getDominantNarrative, calculateNarrativeTemperature, NARRATIVES } from '../narrative.js';

// Mock DB module
vi.mock('../../lib/db.js', () => {
  return {
    query: vi.fn()
  };
});

// Mock narrative module
vi.mock('../narrative.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDominantNarrative: vi.fn(),
    calculateNarrativeTemperature: vi.fn()
  };
});

describe('Regime Shift Detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateConfidence', () => {
    it('returns 0 if agreeing signals are less than 2', () => {
      expect(calculateConfidence(20, 25, 1)).toBe(0.0);
      expect(calculateConfidence(20, 25, 0)).toBe(0.0);
    });

    it('starts at 80 base confidence for 2 agreeing signals', () => {
      // cooling = 15, heating = 20 -> excess cooling = 0, excess heating = 0
      expect(calculateConfidence(15, 20, 2)).toBe(80.0);
    });

    it('starts at 85 base confidence for 3 agreeing signals', () => {
      // cooling = 15, heating = 20 -> excess cooling = 0, excess heating = 0
      expect(calculateConfidence(15, 20, 3)).toBe(85.0);
    });

    it('adds excess cooling and heating bonus capped at 15%', () => {
      // cooling = 25 (excess = 10), heating = 30 (excess = 10)
      // bonus = (10 + 10) * 0.5 = 10
      // confidence = 80 + 10 = 90
      expect(calculateConfidence(25, 30, 2)).toBe(90.0);

      // cooling = 45 (excess = 30), heating = 50 (excess = 30)
      // bonus = (30 + 30) * 0.5 = 30, capped at 15
      // confidence = 85 + 15 = 100
      expect(calculateConfidence(45, 50, 3)).toBe(100.0);
    });
  });

  describe('countAgreeingSignals', () => {
    it('returns correct number of agreeing signals based on scores', async () => {
      // Case: News, Flow, and Sector all agree
      calculateNarrativeTemperature.mockImplementation(async (id) => {
        if (id === 'NAR_01') {
          // Source (from) narrative
          return { newsScore: 30, flowScore: 20, sectorScore: 20 };
        }
        if (id === 'NAR_04') {
          // Target (to) narrative
          return { newsScore: 45, flowScore: 60, sectorScore: 70 };
        }
        return { newsScore: 0, flowScore: 0, sectorScore: 0 };
      });

      const count = await countAgreeingSignals('NAR_01', 'NAR_04');
      // newsAgrees: target.newsScore (45) > source.newsScore (30) && target.newsScore >= 40 (true)
      // flowAgrees: target.flowScore (60) >= 50 (true)
      // sectorAgrees: target.sectorScore (70) >= 50 (true)
      expect(count).toBe(3);
    });

    it('returns partial agreement correctly', async () => {
      calculateNarrativeTemperature.mockImplementation(async (id) => {
        if (id === 'NAR_01') {
          return { newsScore: 50, flowScore: 20, sectorScore: 20 };
        }
        if (id === 'NAR_04') {
          return { newsScore: 45, flowScore: 60, sectorScore: 30 };
        }
        return { newsScore: 0, flowScore: 0, sectorScore: 0 };
      });

      const count = await countAgreeingSignals('NAR_01', 'NAR_04');
      // newsAgrees: target.newsScore (45) > source.newsScore (50) -> false
      // flowAgrees: target.flowScore (60) >= 50 -> true
      // sectorAgrees: target.sectorScore (30) >= 50 -> false
      expect(count).toBe(1);
    });
  });

  describe('detectShift', () => {
    it('returns null during cold-start mode when database has less than 48 hours of history', async () => {
      // Mock less than 48 hours of history: e.g. earliest record is 12 hours ago
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      query.mockResolvedValueOnce([{ earliest: twelveHoursAgo }]);

      // Dominant narrative
      getDominantNarrative.mockResolvedValueOnce({ id: 'NAR_01', name: 'Institutional Accumulation', temperature: 60.0 });

      const narrativeTemperatures = {
        'NAR_01': 45.0, // cooling = 45 - 45 = 0
        'NAR_04': 75.0  // heating = 75 - 75 = 0
      };

      const result = await detectShift(narrativeTemperatures);
      expect(result).toBeNull();
    });

    it('detects a narrative shift when all thresholds and signal agreements are met', async () => {
      // Mock enough history
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('MIN(recorded_at)')) {
          return [{ earliest: threeDaysAgo }];
        }
        if (sql.includes('narrative_history') && sql.includes('recorded_at <= datetime')) {
          // Historical temperature mock for different narratives
          const [narrativeId] = params;
          if (narrativeId === 'NAR_01') {
            return [{ temperature: 80.0 }]; // dominant temp 48h ago
          }
          if (narrativeId === 'NAR_04') {
            return [{ temperature: 15.0 }]; // emerging temp 48h ago
          }
        }
        return [];
      });

      // Dominant narrative: NAR_01
      getDominantNarrative.mockResolvedValueOnce({ id: 'NAR_01', name: 'Institutional Accumulation', temperature: 55.0 });

      // Current temperatures
      const narrativeTemperatures = {
        'NAR_01': 55.0, // cooling = 80.0 - 55.0 = 25.0 (>= 15 degrees)
        'NAR_04': 50.0  // heating = 50.0 - 15.0 = 35.0 (>= 20 degrees, tempNow = 50 >= 40)
      };

      // Mock agreeing signals
      calculateNarrativeTemperature.mockImplementation(async (id) => {
        if (id === 'NAR_01') {
          return { newsScore: 20, flowScore: 20, sectorScore: 20 };
        }
        if (id === 'NAR_04') {
          return { newsScore: 50, flowScore: 60, sectorScore: 70 };
        }
        return { newsScore: 0, flowScore: 0, sectorScore: 0 };
      });

      const result = await detectShift(narrativeTemperatures);

      // Verify the regime shift trigger
      expect(result).not.toBeNull();
      expect(result.from_narrative).toBe('NAR_01');
      expect(result.to_narrative).toBe('NAR_04');
      // cooling = 25, heating = 35, signalsAgreeing = 3 -> base confidence = 85
      // coolingExcess = 10, heatingExcess = 15 -> bonus = (10 + 15) * 0.5 = 12.5
      // confidence = 85 + 12.5 = 97.5
      expect(result.confidence).toBe(97.5);
    });

    it('rejects shift when dominant cooling is less than 15 degrees', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('MIN(recorded_at)')) {
          return [{ earliest: threeDaysAgo }];
        }
        if (sql.includes('narrative_history')) {
          const [narrativeId] = params;
          if (narrativeId === 'NAR_01') {
            return [{ temperature: 60.0 }]; // dominant temp 48h ago
          }
        }
        return [];
      });

      // Dominant: NAR_01
      getDominantNarrative.mockResolvedValueOnce({ id: 'NAR_01', name: 'Institutional Accumulation', temperature: 50.0 });

      // Current temperatures
      const narrativeTemperatures = {
        'NAR_01': 50.0, // cooling = 60 - 50 = 10 (less than 15)
        'NAR_04': 50.0
      };

      const result = await detectShift(narrativeTemperatures);
      expect(result).toBeNull();
    });

    it('rejects shift when emerging heating is less than 20 degrees', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('MIN(recorded_at)')) {
          return [{ earliest: threeDaysAgo }];
        }
        if (sql.includes('narrative_history')) {
          const [narrativeId] = params;
          if (narrativeId === 'NAR_01') {
            return [{ temperature: 80.0 }]; // cooling = 80 - 50 = 30
          }
          if (narrativeId === 'NAR_04') {
            return [{ temperature: 35.0 }]; // heating = 50 - 35 = 15 (less than 20)
          }
        }
        return [];
      });

      getDominantNarrative.mockResolvedValueOnce({ id: 'NAR_01', name: 'Institutional Accumulation', temperature: 50.0 });

      const narrativeTemperatures = {
        'NAR_01': 50.0,
        'NAR_04': 50.0
      };

      const result = await detectShift(narrativeTemperatures);
      expect(result).toBeNull();
    });

    it('rejects shift when emerging temperature is below 40 degrees', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('MIN(recorded_at)')) {
          return [{ earliest: threeDaysAgo }];
        }
        if (sql.includes('narrative_history')) {
          const [narrativeId] = params;
          if (narrativeId === 'NAR_01') {
            return [{ temperature: 80.0 }];
          }
          if (narrativeId === 'NAR_04') {
            return [{ temperature: 10.0 }]; // heating = 35 - 10 = 25 (>= 20, but current temp 35 < 40)
          }
        }
        return [];
      });

      getDominantNarrative.mockResolvedValueOnce({ id: 'NAR_01', name: 'Institutional Accumulation', temperature: 50.0 });

      const narrativeTemperatures = {
        'NAR_01': 50.0,
        'NAR_04': 35.0
      };

      const result = await detectShift(narrativeTemperatures);
      expect(result).toBeNull();
    });

    it('rejects shift when agreeing signals are less than 2', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      query.mockImplementation(async (sql, params) => {
        if (sql.includes('MIN(recorded_at)')) {
          return [{ earliest: threeDaysAgo }];
        }
        if (sql.includes('narrative_history')) {
          const [narrativeId] = params;
          if (narrativeId === 'NAR_01') {
            return [{ temperature: 80.0 }];
          }
          if (narrativeId === 'NAR_04') {
            return [{ temperature: 15.0 }];
          }
        }
        return [];
      });

      getDominantNarrative.mockResolvedValueOnce({ id: 'NAR_01', name: 'Institutional Accumulation', temperature: 55.0 });

      const narrativeTemperatures = {
        'NAR_01': 55.0,
        'NAR_04': 50.0
      };

      // Mock only 1 agreeing signal (e.g. flow score is high, others are low)
      calculateNarrativeTemperature.mockImplementation(async (id) => {
        if (id === 'NAR_01') {
          return { newsScore: 40, flowScore: 20, sectorScore: 20 };
        }
        if (id === 'NAR_04') {
          // newsAgrees: 42 > 40 && 42 >= 40 (true)
          // flowAgrees: 30 >= 50 (false)
          // sectorAgrees: 30 >= 50 (false)
          return { newsScore: 42, flowScore: 30, sectorScore: 30 };
        }
        return { newsScore: 0, flowScore: 0, sectorScore: 0 };
      });

      const result = await detectShift(narrativeTemperatures);
      expect(result).toBeNull();
    });
  });
});
