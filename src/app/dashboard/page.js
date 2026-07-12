'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/shared/Header';
import BubbleMap from '../../components/narrative/BubbleMap';
import Timeline from '../../components/narrative/Timeline';
import ShiftAlert from '../../components/narrative/ShiftAlert';

export default function DashboardPage() {
  const [narrativeData, setNarrativeData] = useState({ temperatures: {}, shifts: [] });
  const [tradeData, setTradeData] = useState({ riskConfig: { threshold: 80 } });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch narrative states
      const narrRes = await fetch('/api/narrative');
      const narrJson = await narrRes.json();
      if (narrJson.success) {
        setNarrativeData({
          temperatures: narrJson.temperatures || {},
          shifts: narrJson.shifts || []
        });
      }

      // Fetch trade states (including risk config thresholds)
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
    fetchData();
    // 15 seconds polling interval for live updates
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const latestShift = narrativeData.shifts?.[0];
  const threshold = tradeData.riskConfig?.threshold || 80;

  return (
    <main className="min-h-screen bg-[#0a0c10]">
      <Header />
      <motion.div 
        className="container dashboard px-6 py-8 max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#242b3b] pb-4 mb-6 gap-4">
          <div>
            <motion.h1 
              className="text-2xl md:text-3xl font-black text-[#f0f2f5] tracking-tight"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              Narrative Intelligence Dashboard
            </motion.h1>
            <p className="text-xs text-[#8c9ba5] mt-1">
              Real-time monitoring of crypto market regimes, ETF flows, and sentiment rotations.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#00f0ff] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
              Syncing Ledger...
            </div>
          )}
        </div>
        
        <div className="dashboard-grid">
          <motion.div 
            className="main-viz"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <BubbleMap temperatures={narrativeData.temperatures} />
          </motion.div>
          
          <motion.div 
            className="alert-side"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <ShiftAlert shift={latestShift} threshold={threshold} />
          </motion.div>
        </div>
        
        <motion.div 
          className="timeline-section mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <Timeline shifts={narrativeData.shifts} />
        </motion.div>
      </motion.div>
    </main>
  );
}
