'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function TradeHistory({ trades = [] }) {
  return (
    <div className="trade-history bg-[#12161f] border border-[#242b3b] p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#f0f2f5] flex items-center gap-2">
            <span className="text-[#007aff]">📜</span> Completed Execution History
          </h3>
          <p className="text-xs text-[#8c9ba5] mt-0.5">Logs of autonomous and manual trades on SoDEX</p>
        </div>
        <span className="text-xs font-semibold text-[#8c9ba5] bg-[#1b212f] px-2.5 py-1 rounded-full border border-[#242b3b]">
          {trades.length} Total Trades
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#242b3b] text-[#8c9ba5] font-bold">
              <th className="pb-3">Time</th>
              <th className="pb-3">Side</th>
              <th className="pb-3">Market</th>
              <th className="pb-3 text-right">Quantity</th>
              <th className="pb-3 text-right">Fill Price</th>
              <th className="pb-3 text-right">Stop Loss</th>
              <th className="pb-3 text-center">Status</th>
              <th className="pb-3 text-center">Story link</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-6 text-center text-[#8c9ba5] italic">
                  No execution logs found in the database.
                </td>
              </tr>
            ) : (
              trades.map((trade, idx) => {
                const dateStr = new Date(trade.created_at || Date.now()).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                const isBuy = trade.side.toLowerCase() === 'buy';
                const status = trade.status.toUpperCase();

                let statusColor = 'text-[#8c9ba5] bg-[#1b212f] border-[#242b3b]';
                if (status === 'FILLED') {
                  statusColor = 'text-[#34c759] bg-[rgba(52,199,89,0.1)] border-[rgba(52,199,89,0.2)]';
                } else if (status === 'STOPPED') {
                  statusColor = 'text-[#ff3b30] bg-[rgba(255,59,48,0.1)] border-[rgba(255,59,48,0.2)]';
                } else if (status === 'CANCELLED') {
                  statusColor = 'text-[#ff9500] bg-[rgba(255,149,0,0.1)] border-[rgba(255,149,0,0.2)]';
                }

                return (
                  <motion.tr
                    key={trade.id || idx}
                    className="border-b border-[#1b212f] hover:bg-[#1b212f]/40 transition-colors"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.5) }}
                  >
                    <td className="py-3.5 text-[#8c9ba5] font-medium">{dateStr}</td>
                    <td className="py-3.5">
                      <span 
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isBuy 
                            ? 'bg-[rgba(52,199,89,0.15)] text-[#34c759] border border-[rgba(52,199,89,0.2)]'
                            : 'bg-[rgba(255,59,48,0.15)] text-[#ff3b30] border border-[rgba(255,59,48,0.2)]'
                        }`}
                      >
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-[#f0f2f5]">{trade.pair}</td>
                    <td className="py-3.5 text-right font-mono text-[#f0f2f5]">{parseFloat(trade.quantity).toFixed(4)}</td>
                    <td className="py-3.5 text-right font-mono text-[#f0f2f5]">
                      ${trade.fill_price ? parseFloat(trade.fill_price).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td className="py-3.5 text-right font-mono text-[#8c9ba5]">
                      {trade.stop_loss_price ? `$${parseFloat(trade.stop_loss_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'}
                    </td>
                    <td className="py-3.5 text-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      {trade.story_id ? (
                        <Link 
                          href={`/story/${trade.story_id}`}
                          className="text-[#00f0ff] hover:text-[#007aff] font-bold text-[11px] underline transition-colors"
                        >
                          Read Coverage
                        </Link>
                      ) : (
                        <span className="text-[#5e6d78] text-[11px]">System Order</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
