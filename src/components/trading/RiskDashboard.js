'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function RiskDashboard({ 
  positions = [], 
  autoTradeEnabled = false,
  cooldownHours = 48,
  maxAllocation = 0.30,
  stopLossPercentage = 0.08
}) {
  // Calculate stop-loss metrics
  const activeStopLossesCount = positions.filter(p => p.stopLoss && parseFloat(pos => pos.stopLoss) !== 0).length;
  
  // Custom mock data for daily circuit breaker parameters
  const maxDailyLossLimit = 5.0; // 5% max drawdown per day
  const currentDailyDrawdown = 0.0; // 0.0% nominal
  const circuitBreakerTriggered = false;

  // Last trade cooldown mock
  const lastTradeTime = new Date(Date.now() - 14 * 60 * 60 * 1000); // 14 hours ago
  const hoursSinceLastTrade = 14;
  const isCooldownActive = hoursSinceLastTrade < cooldownHours;
  const cooldownRemaining = cooldownHours - hoursSinceLastTrade;

  return (
    <div className="risk-dashboard bg-[#12161f] border border-[#242b3b] p-6 rounded-lg shadow-lg">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-[#f0f2f5] flex items-center gap-2">
          <span className="text-[#ff9500]">🛡️</span> Risk & Safety Dashboard
        </h3>
        <p className="text-xs text-[#8c9ba5] mt-0.5">Real-time risk guards, stop-losses, and circuit breakers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Guard Rails Status */}
        <div className="bg-[#1b212f] border border-[#242b3b] rounded-lg p-4 flex flex-col justify-between">
          <span className="text-[10px] text-[#8c9ba5] uppercase font-bold tracking-wider mb-2">Automated Risk Guards</span>
          
          <div className="space-y-3.5">
            {/* Master Auto-Trade */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8c9ba5]">Autonomous Trading:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                autoTradeEnabled 
                  ? 'bg-[rgba(52,199,89,0.1)] text-[#34c759] border-[rgba(52,199,89,0.2)]'
                  : 'bg-[rgba(255,149,0,0.1)] text-[#ff9500] border-[rgba(255,149,0,0.2)]'
              }`}>
                {autoTradeEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>

            {/* Circuit Breaker */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8c9ba5]">Daily Loss Circuit-Breaker:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                circuitBreakerTriggered
                  ? 'bg-[rgba(255,59,48,0.1)] text-[#ff3b30] border-[rgba(255,59,48,0.2)]'
                  : 'bg-[rgba(52,199,89,0.1)] text-[#34c759] border-[rgba(52,199,89,0.2)]'
              }`}>
                {circuitBreakerTriggered ? 'TRIGGERED' : 'NOMINAL'}
              </span>
            </div>

            {/* Cooldown Lock */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#8c9ba5]">Narrative Trade Cooldown:</span>
              <div className="flex flex-col items-end">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  isCooldownActive
                    ? 'bg-[rgba(255,149,0,0.1)] text-[#ff9500] border-[rgba(255,149,0,0.2)]'
                    : 'bg-[rgba(52,199,89,0.1)] text-[#34c759] border-[rgba(52,199,89,0.2)]'
                }`}>
                  {isCooldownActive ? 'LOCKED' : 'READY'}
                </span>
                {isCooldownActive && (
                  <span className="text-[9px] text-[#8c9ba5] mt-1">🕒 {cooldownRemaining}h remaining</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Thresholds Summary */}
        <div className="bg-[#1b212f] border border-[#242b3b] rounded-lg p-4">
          <span className="text-[10px] text-[#8c9ba5] uppercase font-bold tracking-wider mb-2 block">Risk Config Limits</span>
          <div className="grid grid-cols-2 gap-4 text-center mt-2">
            <div className="border-r border-[#242b3b] pr-2">
              <div className="text-[10px] text-[#8c9ba5] uppercase">Max Allocation</div>
              <div className="text-lg font-extrabold text-[#f0f2f5] mt-0.5">{(maxAllocation * 100).toFixed(0)}%</div>
              <div className="text-[9px] text-[#5e6d78] mt-0.5">per narrative trade</div>
            </div>
            <div>
              <div className="text-[10px] text-[#8c9ba5] uppercase">Stop Loss Limit</div>
              <div className="text-lg font-extrabold text-[#ff3b30] mt-0.5">{(stopLossPercentage * 100).toFixed(0)}%</div>
              <div className="text-[9px] text-[#5e6d78] mt-0.5">trailing execution</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Trailing Stop Losses */}
      <div>
        <span className="text-[10px] text-[#8c9ba5] uppercase font-bold tracking-wider block mb-3">Active Stop-Loss Thresholds</span>
        
        {positions.length === 0 ? (
          <div className="text-xs text-[#8c9ba5] italic p-4 text-center bg-[#1b212f] border border-[#242b3b] rounded-lg">
            No active positions to monitor.
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => {
              const curPrice = parseFloat(pos.currentPrice || 0);
              const slPrice = parseFloat(pos.stopLoss || 0);
              
              // Calculate percentage distance to stop loss
              const distancePct = curPrice > 0 ? ((curPrice - slPrice) / curPrice) * 100 : 0;
              const maxDistancePct = stopLossPercentage * 100; // E.g., 8%
              
              // Map progress bar width (from 0% left before stop loss to 100% maximum safety distance)
              const safetyFactor = Math.max(0, Math.min(100, (distancePct / maxDistancePct) * 100));
              
              // Determine safety color
              let barColor = 'bg-[#34c759]'; // Green
              if (safetyFactor < 30) {
                barColor = 'bg-[#ff3b30]'; // Red (very close to stop loss)
              } else if (safetyFactor < 65) {
                barColor = 'bg-[#ff9500]'; // Orange
              }

              return (
                <div key={pos.asset} className="bg-[#1b212f] border border-[#242b3b] p-3.5 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-[#f0f2f5]">{pos.asset}-USDC</span>
                    <span className="text-[#8c9ba5]">
                      Current: <b className="text-[#f0f2f5]">${curPrice.toLocaleString()}</b> | Stop: <b className="text-[#ff3b30]">${slPrice.toLocaleString()}</b>
                    </span>
                  </div>

                  {/* Distance visualization */}
                  <div className="flex items-center gap-3">
                    <div className="flex-grow h-2 bg-[#12161f] rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full ${barColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${safetyFactor}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#8c9ba5] w-12 text-right">
                      {distancePct.toFixed(1)}% away
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
