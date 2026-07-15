import { vi, describe, it, expect, beforeEach } from 'vitest';
import { runPruningCycle } from '../scheduler.js';
import { execute } from '../db.js';

// Mock the db.js module
vi.mock('../db.js', () => {
  return {
    query: vi.fn(),
    execute: vi.fn().mockResolvedValue({ rowsAffected: 1, lastInsertRowid: 1 })
  };
});

describe('TTL Cache Pruning Cycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs queries to delete rows older than TTL and confirms parameters', async () => {
    await runPruningCycle();

    // Verify execute was called twice: once for news_items and once for etf_flows
    expect(execute).toHaveBeenCalledTimes(2);

    const calls = execute.mock.calls;
    
    // First call: delete news older than 48 hours
    expect(calls[0][0]).toContain('DELETE FROM news_items');
    expect(calls[0][0]).toContain('-48 hours');

    // Second call: delete etf_flows older than 24 hours
    expect(calls[1][0]).toContain('DELETE FROM etf_flows');
    expect(calls[1][0]).toContain('-24 hours');
  });
});
