'use client';

import React from 'react';
import { motion } from 'framer-motion';

const NARRATIVE_META = {
  'NAR_01': { name: 'Institutional Accumulation', color: '#007aff' },
  'NAR_02': { name: 'Retail FOMO', color: '#ff9500' },
  'NAR_03': { name: 'Regulatory Storm', color: '#ff3b30' },
  'NAR_04': { name: 'AI/Tech Rotation', color: '#00f0ff' },
  'NAR_05': { name: 'DeFi Renaissance', color: '#34c759' },
  'NAR_06': { name: 'Risk-Off Flight', color: '#8e44ad' },
  'NAR_07': { name: 'L2/Infra Cycle', color: '#f1c40f' },
  'NAR_08': { name: 'Black Swan', color: '#e74c3c' }
};

export default function ShiftAlert({ shift, threshold = 80 }) {
  if (!shift) return null;

  const confidence = parseFloat(shift.confidence || 0);
  const isHighConfidence = confidence >= threshold;

  // Render nothing or standard state if confidence is not high enough for a trade alert
  if (!isHighConfidence) {
    return (
      <div className="p-4 bg-[#12161f] border border-[#242b3b] rounded-lg text-center text-xs text-[#8c9ba5]">
        ℹ️ Last detected shift confidence was <b>{confidence.toFixed(1)}%</b> (Trade threshold: <b>{threshold}%</b>). No automated execution triggered.
      </div>
    );
  }

  const fromMeta = NARRATIVE_META[shift.from_narrative] || { name: shift.from_narrative, color: '#8c9ba5' };
  const toMeta = NARRATIVE_META[shift.to_narrative] || { name: shift.to_narrative, color: '#00f0ff' };

  let signalsArray = [];
  if (shift.signals) {
    try {
      signalsArray = typeof shift.signals === 'string' ? JSON.parse(shift.signals) : shift.signals;
    } catch (e) {
      signalsArray = [shift.signals];
    }
  }

  return (
    <motion.div 
      className="shift-alert-card bg-gradient-to-br from-[#1b212f] to-[#12161f] border-2 border-[#ff3b30] p-6 rounded-xl shadow-[0_0_15px_rgba(255,59,48,0.25)] relative overflow-hidden"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Pulsing red beacon indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[rgba(255,59,48,0.1)] border border-[rgba(255,59,48,0.2)] text-[#ff3b30] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] animate-ping" />
        Live Execution
      </div>

      <div className="flex flex-col gap-1.5 mb-4">
        <h4 className="text-sm font-black text-[#ff3b30] uppercase tracking-wider">⚠️ Narrative Regime Shift Triggered</h4>
        <p className="text-xs text-[#8c9ba5]">
          A high-confidence narrative transition has crossed the trading threshold of {threshold}%.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#12161f] border border-[#242b3b] rounded-lg p-4 mb-4">
        <div className="flex flex-col gap-1 border-r border-[#242b3b] pr-2">
          <span className="text-[10px] text-[#5e6d78] uppercase font-bold tracking-wider">Previous Regime</span>
          <span className="text-sm font-extrabold text-[#f0f2f5] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fromMeta.color }} />
            {fromMeta.name}
          </span>
        </div>

        <div className="flex flex-col gap-1 md:pl-2">
          <span className="text-[10px] text-[#00f0ff] uppercase font-bold tracking-wider">Active Target Regime</span>
          <span className="text-sm font-extrabold text-[#00f0ff] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: toMeta.color }} />
            {toMeta.name}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-xs">
        <div>
          <span className="text-[#8c9ba5]">Confidence Level:</span>{' '}
          <span className="text-[#34c759] font-black">{confidence.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-[#8c9ba5]">Detected At:</span>{' '}
          <span className="text-[#f0f2f5] font-semibold">{new Date(shift.detected_at).toLocaleString()}</span>
        </div>
        {shift.trade_id && (
          <div>
            <span className="text-[#8c9ba5]">System Action:</span>{' '}
            <span className="text-[#007aff] font-bold">REBALANCING ORDER EXECUTION ({shift.trade_id.slice(0, 8)}...)</span>
          </div>
        )}
      </div>

      {signalsArray && signalsArray.length > 0 && (
        <div className="pt-3 border-t border-[#242b3b]">
          <span className="text-[10px] text-[#5e6d78] uppercase font-bold tracking-wider block mb-2">Supporting Evidence Summary</span>
          <ul className="list-none p-0 m-0 space-y-1.5">
            {signalsArray.map((sig, idx) => (
              <li key={idx} className="text-xs text-[#8c9ba5] flex items-start gap-2">
                <span className="text-[#ff3b30] font-bold">✓</span>
                <span>{sig}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
