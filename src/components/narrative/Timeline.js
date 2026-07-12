'use client';

import React from 'react';
import Link from 'next/link';
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

export default function Timeline({ shifts = [] }) {
  if (!shifts || shifts.length === 0) {
    return (
      <div className="narrative-timeline p-6 text-center text-[#8c9ba5] border border-[#242b3b] rounded-lg bg-[#12161f]">
        <p className="text-sm font-medium">No regime shifts detected in the database.</p>
        <p className="text-xs text-[#5e6d78] mt-1">Autonomous monitoring checks run hourly.</p>
      </div>
    );
  }

  return (
    <div className="narrative-timeline border border-[#242b3b] rounded-lg bg-[#12161f] p-6 shadow-lg overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#f0f2f5] flex items-center gap-2">
            <span className="text-[#00f0ff]">⏰</span> Narrative Regime Shifts Timeline
          </h3>
          <p className="text-xs text-[#8c9ba5] mt-0.5">Historical sequence of autonomous narrative rotations</p>
        </div>
        <span className="text-xs font-semibold text-[#8c9ba5] bg-[#1b212f] px-2.5 py-1 rounded-full border border-[#242b3b]">
          {shifts.length} Shifts Detected
        </span>
      </div>

      {/* Horizontal Scrollable Timeline Wrapper */}
      <div className="relative flex items-stretch gap-6 overflow-x-auto pb-4 pt-2 scrollbar-thin">
        {/* Timeline Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#242b3b] via-[#00f0ff22] to-[#242b3b] -translate-y-1/2 z-0" />

        {shifts.map((shift, idx) => {
          const fromMeta = NARRATIVE_META[shift.from_narrative] || { name: shift.from_narrative, color: '#8c9ba5' };
          const toMeta = NARRATIVE_META[shift.to_narrative] || { name: shift.to_narrative, color: '#00f0ff' };
          const formattedDate = new Date(shift.detected_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const isHighConfidence = shift.confidence >= 80;

          return (
            <motion.div
              key={shift.id || idx}
              className="flex-shrink-0 w-80 bg-[#1b212f] border border-[#242b3b] rounded-xl p-5 shadow-md flex flex-col justify-between relative z-10 hover:border-[#00f0ff] transition-colors"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
            >
              {/* Date Marker */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-[#8c9ba5]">{formattedDate}</span>
                <span 
                  className={`text-xs px-2 py-0.5 rounded font-extrabold border ${
                    isHighConfidence 
                      ? 'bg-[rgba(52,199,89,0.1)] text-[#34c759] border-[rgba(52,199,89,0.2)]'
                      : 'bg-[rgba(255,149,0,0.1)] text-[#ff9500] border-[rgba(255,149,0,0.2)]'
                  }`}
                >
                  {shift.confidence.toFixed(0)}% Conf
                </span>
              </div>

              {/* Path of Shift */}
              <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: fromMeta.color }} />
                  <span className="text-xs text-[#8c9ba5] truncate font-medium">{fromMeta.name}</span>
                </div>
                <div className="pl-4 text-xs font-bold text-[#00f0ff]">➔ ROTATION➔</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: toMeta.color }} />
                  <span className="text-xs text-[#f0f2f5] truncate font-bold">{toMeta.name}</span>
                </div>
              </div>

              {/* Trigger Signals */}
              {shift.signals && shift.signals.length > 0 && (
                <div className="bg-[#12161f] border border-[#242b3b] rounded-lg p-3 mb-4 flex-grow">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#5e6d78] mb-1.5">Evidence Signals</div>
                  <ul className="list-none p-0 m-0 space-y-1.5">
                    {shift.signals.slice(0, 3).map((sig, sigIdx) => (
                      <li key={sigIdx} className="text-[11px] text-[#8c9ba5] leading-relaxed flex items-start gap-1">
                        <span className="text-[#00f0ff] flex-shrink-0">•</span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex gap-2 mt-auto">
                {shift.story_id ? (
                  <Link 
                    href={`/story/${shift.story_id}`}
                    className="flex-1 text-center bg-[#242b3b] hover:bg-[#2e374a] text-xs font-bold py-2 rounded text-[#f0f2f5] transition-colors border border-[#242b3b]"
                  >
                    📖 Read Story
                  </Link>
                ) : (
                  <div className="flex-1 text-center bg-[#12161f] text-[11px] text-[#5e6d78] py-2 rounded border border-[#1b212f]">
                    No Story Generated
                  </div>
                )}
                
                {shift.trade_id ? (
                  <Link 
                    href="/portfolio"
                    className="bg-[rgba(0,122,255,0.15)] hover:bg-[rgba(0,122,255,0.25)] border border-[rgba(0,122,255,0.3)] text-[#00f0ff] text-xs font-bold px-3 py-2 rounded transition-colors"
                  >
                    📈 Trade
                  </Link>
                ) : (
                  <div className="text-[11px] text-[#5e6d78] bg-[#12161f] px-3 py-2 rounded border border-[#1b212f] flex items-center">
                    No Trade
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #12161f;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #242b3b;
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #343d52;
        }
      `}</style>
    </div>
  );
}
