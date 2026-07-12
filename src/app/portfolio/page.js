'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/shared/Header';
import PortfolioView from '../../components/trading/PortfolioView';
import TradeHistory from '../../components/trading/TradeHistory';
import RiskDashboard from '../../components/trading/RiskDashboard';
import QuickTrade from '../../components/trading/QuickTrade';

export default function PortfolioPage() {
  const [tradeData, setTradeData] = useState({
    balance: '0.00',
    positions: [],
    trades: [],
    riskConfig: {
      autoTradeEnabled: false,
      cooldownHours: 48,
      maxAllocation: 0.30,
      stopLossPercentage: 0.08
    }
  });
  const [narrativeData, setNarrativeData] = useState({ temperatures: {} });
  const [loading, setLoading] = useState(true);

  const fetchPortfolioData = async () => {
    try {
      const tradeRes = await fetch('/api/trade');
      const tradeJson = await tradeRes.json();
      if (tradeJson.success) {
        setTradeData(tradeJson);
      }

      const narrRes = await fetch('/api/narrative');
      const narrJson = await narrRes.json();
      if (narrJson.success) {
        setNarrativeData(narrJson);
      }
    } catch (e) {
      console.error('Error fetching portfolio page data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
    // Refresh every 30 seconds for live updates
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTradeSuccess = () => {
    fetchPortfolioData();
  };

  return (
    <main className="min-h-screen bg-[#0a0c10]">
      <Header />
      <motion.div 
        className="container portfolio px-6 py-8 max-w-7xl mx-auto"
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
              SoDEX Portfolio & Risk Management
            </motion.h1>
            <p className="text-xs text-[#8c9ba5] mt-1">
              Verify smart contract balances, trailing stops, and configure manual execution parameters.
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#00f0ff] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
              Syncing Balances...
            </div>
          )}
        </div>
        
        <div className="portfolio-grid">
          <motion.div 
            className="portfolio-col-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <PortfolioView 
              balance={tradeData.balance}
              positions={tradeData.positions}
              onTradeSuccess={handleTradeSuccess}
            />
            <div className="mt-6">
              <TradeHistory trades={tradeData.trades} />
            </div>
          </motion.div>
          
          <motion.div 
            className="portfolio-col-4 flex flex-col gap-6"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <QuickTrade onTradeSuccess={handleTradeSuccess} />
            <RiskDashboard 
              positions={tradeData.positions}
              autoTradeEnabled={tradeData.riskConfig?.autoTradeEnabled}
              cooldownHours={tradeData.riskConfig?.cooldownHours}
              maxAllocation={tradeData.riskConfig?.maxAllocation}
              stopLossPercentage={tradeData.riskConfig?.stopLossPercentage}
            />
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
