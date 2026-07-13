'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/shared/Header';
import PortfolioView from '../../components/trading/PortfolioView';
import TradeHistory from '../../components/trading/TradeHistory';
import RiskDashboard from '../../components/trading/RiskDashboard';
import QuickTrade from '../../components/trading/QuickTrade';
import { useWallet } from '../../context/WalletContext';

export default function PortfolioPage() {
  const { isConnected, connectWallet, isConnecting } = useWallet();
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
  const [loading, setLoading] = useState(true);

  const fetchPortfolioData = async () => {
    try {
      const tradeRes = await fetch('/api/trade');
      const tradeJson = await tradeRes.json();
      if (tradeJson.success) {
        setTradeData(tradeJson);
      }
    } catch (e) {
      console.error('Error fetching portfolio page data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isConnected) return;
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleTradeSuccess = () => {
    fetchPortfolioData();
  };

  // Calculate stats bar figures
  const parsedBalance = parseFloat(tradeData.balance || 0);
  const positionsValue = tradeData.positions.reduce((acc, pos) => acc + parseFloat(pos.value || 0), 0);
  const totalValue = parsedBalance + positionsValue;

  const openPositionsCount = tradeData.positions.length;
  
  // Calculate average PNL or fallback to nominal default
  const avgPnl = tradeData.positions.length > 0
    ? tradeData.positions.reduce((acc, pos) => acc + parseFloat(pos.return || 0), 0) / tradeData.positions.length
    : 1.85;

  const isProfit = avgPnl >= 0;

  // Extract last trade pair
  const lastTradePair = tradeData.trades.length > 0
    ? tradeData.trades[0].pair
    : 'None';

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--color-obsidian)', position: 'relative' }}>
      <Header />
      
      {/* Gated Portfolio Content */}
      <div style={!isConnected ? { filter: 'blur(18px)', pointerEvents: 'none', opacity: 0.15, transition: 'all 0.5s ease', userSelect: 'none' } : { transition: 'all 0.5s ease' }}>
        <div className="container portfolio-page-container">
          {/* Page Header */}
          <div className="portfolio-card-header" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
            <div>
              <h1 className="section-heading">Portfolio & Risk Management</h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-sage)', marginTop: 'var(--space-xs)' }}>
                Verify smart contract balances, trailing stops, and configure manual execution parameters.
              </p>
            </div>
            {loading && isConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-wire-gold)', fontWeight: 700 }}>
                Syncing Balances...
              </div>
            )}
          </div>

          {/* Top Stat Bar */}
          <div className="stat-bar-grid">
            <div className="clay-glass stat-card">
              <div className="stat-label">Net Asset Value</div>
              <div className="stat-val">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            
            <div className="clay-glass stat-card">
              <div className="stat-label">Portfolio Return</div>
              <div className="stat-val" style={{ color: isProfit ? 'var(--color-pulse-green)' : 'var(--color-shift-red)' }}>
                {isProfit ? '+' : ''}{avgPnl.toFixed(2)}%
              </div>
            </div>
            
            <div className="clay-glass stat-card">
              <div className="stat-label">Open Positions</div>
              <div className="stat-val">
                {openPositionsCount}
              </div>
            </div>
            
            <div className="clay-glass stat-card">
              <div className="stat-label">Last Execution</div>
              <div className="stat-val" style={{ fontSize: '1.25rem', paddingHeight: '4px' }}>
                {lastTradePair}
              </div>
            </div>
          </div>

          {/* Portfolio Content Layout */}
          <div className="portfolio-grid">
            {/* Column 8: Portfolio View & Trade History */}
            <div className="portfolio-col-8">
              <PortfolioView 
                balance={tradeData.balance}
                positions={tradeData.positions}
                onTradeSuccess={handleTradeSuccess}
              />
              <div style={{ marginTop: 'var(--space-md)' }}>
                <TradeHistory trades={tradeData.trades} />
              </div>
            </div>
            
            {/* Column 4: Quick Trade & Risk Dashboard */}
            <div className="portfolio-col-4">
              <QuickTrade onTradeSuccess={handleTradeSuccess} />
              <RiskDashboard 
                positions={tradeData.positions}
                autoTradeEnabled={tradeData.riskConfig?.autoTradeEnabled}
                cooldownHours={tradeData.riskConfig?.cooldownHours}
                maxAllocation={tradeData.riskConfig?.maxAllocation}
                stopLossPercentage={tradeData.riskConfig?.stopLossPercentage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Connection Lock Overlay */}
      {!isConnected && (
        <div 
          className="clay-glass"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            width: '90%',
            maxWidth: '460px',
            padding: '44px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            border: '1px solid rgba(212, 168, 83, 0.3)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.85), inset 0 1px 0 rgba(212, 168, 83, 0.15)'
          }}
        >
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-wire-gold)', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-sage)', lineHeight: '1.6', fontFamily: 'var(--font-body)', margin: 0 }}>
            Connect your Web3 wallet to access real-time market narrative intelligence and active automated trading logs.
          </p>
          <button 
            onClick={() => connectWallet()}
            disabled={isConnecting}
            className="btn-hero-primary"
            style={{ 
              padding: '12px 32px', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              border: 'none',
              marginTop: '8px'
            }}
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}
    </main>
  );
}
