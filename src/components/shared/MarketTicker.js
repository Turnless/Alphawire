'use client';

import React, { useEffect, useState } from 'react';

export default function MarketTicker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMarketData = async () => {
    try {
      const res = await fetch('/api/market-update');
      const json = await res.json();
      if (json.success) {
        // Merge sectors and spotlight items
        const items = [...(json.sectors || []), ...(json.spotlight || [])];
        // Remove duplicates if any by name
        const uniqueItems = [];
        const seen = new Set();
        for (const item of items) {
          const name = item.name?.trim();
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            uniqueItems.push(item);
          }
        }
        setData(uniqueItems);
      }
    } catch (e) {
      console.error('Failed to fetch market ticker data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div 
        style={{
          width: '100%',
          height: '40px',
          background: 'rgba(30, 32, 30, 0.6)',
          borderBottom: '1px solid rgba(236, 223, 204, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--color-sage)',
        }}
      >
        <span className="shimmer-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-wire-gold)', display: 'inline-block', marginRight: '8px' }} />
        <span>STREAMING SOSOVALUE MARKET DATA...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Format percent utility
  const formatPercent = (val) => {
    const num = val * 100;
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  };

  const renderTickerList = () => {
    return (
      <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
        {data.map((item, idx) => {
          const change = item.change_pct_24h || 0;
          const isPositive = change >= 0;
          return (
            <div 
              key={`${item.name}-${idx}`} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ color: 'var(--color-linen)', fontWeight: 600 }}>{item.name.trim()}</span>
              <span 
                style={{ 
                  color: isPositive ? 'var(--color-pulse-green)' : 'var(--color-shift-red)',
                  fontWeight: 700 
                }}
              >
                {isPositive ? '▲' : '▼'} {formatPercent(change)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      style={{
        width: '100%',
        height: '40px',
        background: 'rgba(20, 20, 20, 0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(236, 223, 204, 0.08)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        zIndex: 50
      }}
    >
      {/* Static Label Badge */}
      <div 
        style={{
          height: '100%',
          padding: '0 16px',
          background: 'rgba(212, 168, 83, 0.12)',
          borderRight: '1px solid rgba(236, 223, 204, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--color-wire-gold)',
          zIndex: 10,
          whiteSpace: 'nowrap'
        }}
      >
        <span 
          style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--color-pulse-green)', 
            display: 'inline-block',
            boxShadow: '0 0 6px var(--color-pulse-green)'
          }} 
        />
        <span>SOSO VALUE SECTOR FEED</span>
      </div>

      {/* Scrolling Marquee Container */}
      <div 
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          height: '100%'
        }}
      >
        <div 
          className="ticker-scroll" 
          style={{ 
            display: 'flex', 
            gap: '30px', 
            width: 'max-content',
            alignItems: 'center'
          }}
        >
          {renderTickerList()}
          {/* Duplicate for seamless infinite loop scroll */}
          {renderTickerList()}
        </div>
      </div>
    </div>
  );
}
