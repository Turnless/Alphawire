'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function PortfolioView({ balance = '0.00', positions = [], onTradeSuccess }) {
  const [isLiquidating, setIsLiquidating] = useState(null);

  const parsedBalance = parseFloat(balance || 0);
  const positionsValue = positions.reduce((acc, pos) => acc + parseFloat(pos.value || 0), 0);
  const totalValue = parsedBalance + positionsValue;

  const handleClosePosition = async (pos) => {
    if (!confirm(`Are you sure you want to close/sell your entire position in ${pos.asset}?`)) return;
    
    setIsLiquidating(pos.asset);
    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pair: `${pos.asset}-USDC`,
          side: 'sell',
          orderType: 'market',
          quantity: pos.quantity,
          price: pos.currentPrice
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Successfully closed position. Order ID: ${data.sodexOrderId}`);
        if (onTradeSuccess) onTradeSuccess();
      } else {
        alert(`Failed to close position: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error executing sell order.');
    } finally {
      setIsLiquidating(null);
    }
  };

  return (
    <div className="portfolio-view bg-[#12161f] border border-[#242b3b] p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#f0f2f5] flex items-center gap-2">
            <span className="text-[#34c759]">💼</span> Live Portfolio Overview
          </h3>
          <p className="text-xs text-[#8c9ba5] mt-0.5">Asset allocations and position values on SoDEX</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#8c9ba5] uppercase font-bold tracking-wider">Total Portfolio Value</div>
          <div className="text-2xl font-black text-[#f0f2f5] mt-0.5">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Allocation breakdown bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-[#8c9ba5] mb-2 font-medium">
          <span>Asset Allocation</span>
          <span>Cash: {((parsedBalance / totalValue) * 100).toFixed(1)}% | Positions: {((positionsValue / totalValue) * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-[#1b212f] rounded-full overflow-hidden flex">
          {/* Cash portion */}
          <div 
            style={{ width: `${(parsedBalance / totalValue) * 100}%` }}
            className="h-full bg-gradient-to-r from-[#007aff] to-[#00f0ff]"
            title={`Cash (USDC): $${parsedBalance.toFixed(2)}`}
          />
          {/* Position portions */}
          {positions.map((pos, idx) => {
            const width = (parseFloat(pos.value || 0) / totalValue) * 100;
            const colors = ['#ff9500', '#34c759', '#8e44ad', '#f1c40f', '#e74c3c'];
            const color = colors[idx % colors.length];
            return (
              <div 
                key={pos.asset}
                style={{ width: `${width}%`, backgroundColor: color }}
                className="h-full"
                title={`${pos.asset}: $${parseFloat(pos.value).toFixed(2)}`}
              />
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-[#8c9ba5]">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#007aff]" />
            <span>USDC: ${parsedBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {positions.map((pos, idx) => {
            const colors = ['#ff9500', '#34c759', '#8e44ad', '#f1c40f', '#e74c3c'];
            const color = colors[idx % colors.length];
            return (
              <div key={pos.asset} className="flex items-center gap-1.5 text-xs text-[#8c9ba5]">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span>{pos.asset}: ${parseFloat(pos.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Positions list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#242b3b] text-[#8c9ba5] font-bold">
              <th className="pb-3">Asset</th>
              <th className="pb-3 text-right">Balance/Qty</th>
              <th className="pb-3 text-right">Entry Price</th>
              <th className="pb-3 text-right">Current Price</th>
              <th className="pb-3 text-right">Stop Loss</th>
              <th className="pb-3 text-right">Value (USD)</th>
              <th className="pb-3 text-right">PNL</th>
              <th className="pb-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-6 text-center text-[#8c9ba5] italic">
                  No active open positions. Cash balance only.
                </td>
              </tr>
            ) : (
              positions.map((pos) => {
                const pnl = parseFloat(pos.return || 0);
                const isProfit = pnl >= 0;
                
                return (
                  <tr key={pos.asset} className="border-b border-[#1b212f] hover:bg-[#1b212f]/40 transition-colors">
                    <td className="py-4 font-black text-[#f0f2f5]">{pos.asset}</td>
                    <td className="py-4 text-right font-mono text-[#f0f2f5]">{parseFloat(pos.quantity).toFixed(4)}</td>
                    <td className="py-4 text-right font-mono text-[#8c9ba5]">${parseFloat(pos.entryPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-4 text-right font-mono text-[#f0f2f5]">${parseFloat(pos.currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-4 text-right font-mono text-[#ff3b30]">${parseFloat(pos.stopLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-4 text-right font-mono font-bold text-[#f0f2f5]">${parseFloat(pos.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className={`py-4 text-right font-mono font-extrabold ${isProfit ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                      {isProfit ? '+' : ''}{pnl.toFixed(2)}%
                    </td>
                    <td className="py-4 text-center">
                      <button
                        onClick={() => handleClosePosition(pos)}
                        disabled={isLiquidating === pos.asset}
                        className="bg-[rgba(255,59,48,0.15)] hover:bg-[rgba(255,59,48,0.25)] border border-[rgba(255,59,48,0.3)] text-[#ff3b30] text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {isLiquidating === pos.asset ? 'Selling...' : 'Close'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
