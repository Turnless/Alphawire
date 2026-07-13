'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../../components/shared/Header';
import BubbleMap from '../../components/narrative/BubbleMap';
import Timeline from '../../components/narrative/Timeline';
import ShiftAlert from '../../components/narrative/ShiftAlert';
import TemperatureGauge from '../../components/narrative/TemperatureGauge';
import { useWallet } from '../../context/WalletContext';

const NARRATIVE_NAMES = {
  NAR_01: 'Institutional Accumulation',
  NAR_02: 'Retail FOMO',
  NAR_03: 'Regulatory Storm',
  NAR_04: 'AI/Tech Rotation',
  NAR_05: 'DeFi Renaissance',
  NAR_06: 'Risk-Off Flight',
  NAR_07: 'L2/Infra Cycle',
  NAR_08: 'Black Swan',
};

export default function DashboardPage() {
  const { isConnected } = useWallet();
  const router = useRouter();
  const [narrativeData, setNarrativeData] = useState({ temperatures: {}, shifts: [] });
  const [tradeData, setTradeData] = useState({ riskConfig: { threshold: 80 } });
  const [loading, setLoading] = useState(true);

  // Redirect if disconnected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  const fetchData = async () => {
    try {
      const narrRes = await fetch('/api/narrative');
      const narrJson = await narrRes.json();
      if (narrJson.success) {
        setNarrativeData({
          temperatures: narrJson.temperatures || {},
          shifts: narrJson.shifts || []
        });
      }

      const tradeRes = await fetch('/api/trade');
      const tradeJson = await tradeRes.json();
      if (tradeJson.success) {
        setTradeData(tradeJson);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only poll when connected
    if (!isConnected) return;
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const latestShift = narrativeData.shifts?.[0];
  const threshold = tradeData.riskConfig?.threshold || 80;

  // Format active narratives list, sorted by temperature descending
  const sortedNarratives = Object.entries(NARRATIVE_NAMES).map(([id, name]) => {
    const data = narrativeData.temperatures[id] || { temperature: 0, recordedAt: new Date().toISOString() };
    return {
      id,
      name,
      temperature: data.temperature,
      recordedAt: data.recordedAt
    };
  }).sort((a, b) => b.temperature - a.temperature);

  if (!isConnected) {
    return <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-obsidian)' }} />;
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-obsidian)' }}>
      <Header />
      
      <div className="container" style={{ padding: 'var(--space-xl) var(--space-lg)' }}>
        {/* Dashboard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          <div>
            <h1 className="section-heading">Narrative Intelligence</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-sage)', marginTop: 'var(--space-xs)' }}>
              Tracks which market narratives are gaining or losing momentum based on ETF flows and sector data.
            </p>
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-wire-gold)', fontWeight: 700 }}>
              Loading...
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Left Column: Bubble Map */}
          <div className="main-viz">
            <div className="clay-glass bubble-map-panel">
              <div className="bubble-map-title">Narrative Heat Map</div>
              <BubbleMap temperatures={narrativeData.temperatures} />
            </div>
          </div>

          {/* Right Column: Key Stats & Narrative List */}
          <div className="side-panel">
            {/* Regime Shift Alerts */}
            <ShiftAlert shift={latestShift} threshold={threshold} />

            {/* Active Narratives Ranked */}
            <div className="clay-glass active-narratives-card" style={{ marginTop: 'var(--space-md)' }}>
              <div className="card-header">Active Narratives</div>
              <div className="narrative-list">
                {sortedNarratives.map((item) => (
                  <div key={item.id} className="narrative-row">
                    <div className="narrative-info">
                      <span className="narrative-name">{item.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="data-mono" style={{ 
                        color: item.temperature > 85 ? 'var(--color-shift-red)' : 
                               item.temperature > 65 ? 'var(--color-wire-gold)' : 
                               'var(--color-linen)',
                        fontWeight: 700
                      }}>
                        {item.temperature.toFixed(1)}&deg;
                      </span>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: item.temperature > 85 ? 'var(--color-shift-red)' : 
                                         item.temperature > 65 ? 'var(--color-wire-gold)' : 
                                         'var(--color-sage)',
                        boxShadow: item.temperature > 85 ? '0 0 8px var(--color-shift-red)' : 'none'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Narrative Timelines & System Logs */}
        <div className="dashboard-row" style={{ marginTop: 'var(--space-xl)' }}>
          <h3 className="section-heading" style={{ marginBottom: 'var(--space-md)' }}>Historical Regime Timelines</h3>
          <Timeline temperatures={narrativeData.temperatures} />
        </div>

        <div className="dashboard-row" style={{ marginTop: 'var(--space-xl)' }}>
          <h3 className="section-heading" style={{ marginBottom: 'var(--space-md)' }}>Autonomous Execution Logs</h3>
          <div className="clay-glass table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Narrative Sector</th>
                  <th>Action Code</th>
                  <th>Execution Status</th>
                </tr>
              </thead>
              <tbody>
                {narrativeData.shifts.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--color-sage)' }}>
                      No execution logs generated yet. Waiting for market shifts.
                    </td>
                  </tr>
                ) : (
                  narrativeData.shifts.map((shift) => {
                    const dateString = new Date(shift.detected_at).toLocaleString();
                    return (
                      <tr key={shift.id}>
                        <td className="data-mono">{dateString}</td>
                        <td>{NARRATIVE_NAMES[shift.narrative_id] || shift.narrative_id}</td>
                        <td>
                          {shift.action === 'regime_shift_trigger' ? (
                            <span style={{ color: 'var(--color-wire-gold)' }}>REGIME_SHIFT_BUY</span>
                          ) : shift.action === 'cooldown_active' ? (
                            <span style={{ color: 'var(--color-sage)' }}>COOLDOWN_HOLD</span>
                          ) : (
                            <span style={{ color: 'var(--color-sage)' }}>N/A</span>
                          )}
                        </td>
                        <td>
                          {shift.trade_id ? (
                            <span className="data-mono" style={{ color: 'var(--color-pulse-green)' }}>
                              Executed
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-sage)' }}>Ignored</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
