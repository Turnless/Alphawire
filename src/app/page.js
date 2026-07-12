'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Header from '../components/shared/Header';
import StoryFeed from '../components/wire/StoryFeed';
import TemperatureGauge from '../components/narrative/TemperatureGauge';
import { useWallet } from '../context/WalletContext';

export default function HomePage() {
  const { scrollY } = useScroll();
  const { isConnected, connectWallet, isConnecting } = useWallet();
  
  // Transform hero opacity, scale, and y translation based on scroll position
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.92]);
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);

  return (
    <main style={{ backgroundColor: 'var(--color-obsidian)', minHeight: '100vh', overflowX: 'hidden' }}>
      <Header />
      
      {/* Hero Section */}
      <section className="hero-section">
        {/* Ambient Blurred Bubble Map Background */}
        <svg className="hero-ambient-svg" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="120" fill="var(--color-wire-gold)" filter="blur(100px)" />
          <circle cx="600" cy="400" r="150" fill="var(--color-data-blue)" filter="blur(120px)" />
          <circle cx="400" cy="300" r="100" fill="var(--color-shift-red)" filter="blur(90px)" />
        </svg>

        <motion.div 
          className="container" 
          style={{ 
            width: '100%', 
            position: 'relative', 
            zIndex: 2,
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY
          }}
        >
          <div className="hero-content">
            <motion.span 
              className="hero-eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              Cinder
            </motion.span>
            
            <motion.h1 
              className="hero-headline"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              Market News That Backs Its Own Trades
            </motion.h1>
            
            <motion.p 
              className="hero-subhead"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
            >
              Tracks ETF flows and market momentum, then places trades on SoDEX when a clear shift is confirmed.
            </motion.p>
            
            <motion.div 
              className="hero-ctas"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
            >
              {isConnected ? (
                <>
                  <a href="/dashboard" className="btn-hero-primary">
                    Market Dashboard
                  </a>
                  <a href="/portfolio" className="btn-hero-secondary">
                    Risk Settings
                  </a>
                </>
              ) : (
                <button 
                  onClick={() => connectWallet()}
                  disabled={isConnecting}
                  className="btn-hero-primary"
                  style={{ 
                    cursor: 'pointer', 
                    padding: '12px 32px', 
                    borderRadius: '12px', 
                    fontWeight: 600,
                    border: 'none',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Feed scrolls up and overlays the hero */}
      <div className="feed-overlay container" style={{ position: 'relative', zIndex: 10, paddingBottom: '60px' }}>
        <div style={!isConnected ? { filter: 'blur(12px)', pointerEvents: 'none', opacity: 0.25, transition: 'all 0.5s ease' } : { transition: 'all 0.5s ease' }}>
          {/* Main Feed Section */}
          <div className="feed-layout">
            <div className="feed-column">
              <StoryFeed />
            </div>
            <div className="sidebar-column">
              <div className="clay-glass" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
                <h3 className="section-heading" style={{ fontSize: '1.15rem', marginBottom: 'var(--space-md)' }}>Current Market Mood</h3>
                <TemperatureGauge />
              </div>
            </div>
          </div>

          {/* Cool Feature 1: Live Ticker */}
          <div style={{ marginTop: '48px', borderTop: '1px solid rgba(236,223,204,0.06)', paddingTop: '32px' }}>
            <h3 className="section-heading" style={{ fontSize: '1.15rem', marginBottom: '20px' }}>Live Order Executions</h3>
            <div style={{ width: '100%', overflow: 'hidden', background: 'rgba(60,61,55,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '14px 0', position: 'relative' }}>
              <div className="ticker-scroll" style={{ display: 'flex', gap: '40px', width: 'max-content' }}>
                <div style={{ display: 'flex', gap: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY CNDR/USDC • $1.24 • 12,450 CNDR • 2m ago</span>
                  <span style={{ color: 'var(--color-shift-red)' }}>● SELL ETH/USDC • $3,421.50 • 2.4 ETH • 8m ago</span>
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY WBTC/USDC • $62,450.00 • 0.15 WBTC • 15m ago</span>
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY CNDR/USDC • $1.22 • 8,900 CNDR • 28m ago</span>
                  <span style={{ color: 'var(--color-shift-red)' }}>● SELL SOL/USDC • $142.80 • 45 SOL • 34m ago</span>
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY DeFi Renaissance • EXECUTION SUCCESS • 42m ago</span>
                </div>
                <div style={{ display: 'flex', gap: '40px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap' }} aria-hidden="true">
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY CNDR/USDC • $1.24 • 12,450 CNDR • 2m ago</span>
                  <span style={{ color: 'var(--color-shift-red)' }}>● SELL ETH/USDC • $3,421.50 • 2.4 ETH • 8m ago</span>
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY WBTC/USDC • $62,450.00 • 0.15 WBTC • 15m ago</span>
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY CNDR/USDC • $1.22 • 8,900 CNDR • 28m ago</span>
                  <span style={{ color: 'var(--color-shift-red)' }}>● SELL SOL/USDC • $142.80 • 45 SOL • 34m ago</span>
                  <span style={{ color: 'var(--color-pulse-green)' }}>● BUY DeFi Renaissance • EXECUTION SUCCESS • 42m ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cool Feature 2: Protocol Performance Stats */}
          <div style={{ marginTop: '48px' }}>
            <h3 className="section-heading" style={{ fontSize: '1.15rem', marginBottom: '20px' }}>System Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div className="clay-glass" style={{ padding: '20px', borderRadius: '16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Autonomous Win Rate</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-pulse-green)' }}>74.8%</div>
              </div>
              <div className="clay-glass" style={{ padding: '20px', borderRadius: '16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Volume Executed</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-linen)' }}>$1,248,390</div>
              </div>
              <div className="clay-glass" style={{ padding: '20px', borderRadius: '16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Average Execution Speed</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-wire-gold)' }}>240ms</div>
              </div>
              <div className="clay-glass" style={{ padding: '20px', borderRadius: '16px' }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--color-sage)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Average Order Slippage</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-data-blue)' }}>&lt; 0.08%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Overlay Box (Centered on page when disconnected) */}
        {!isConnected && (
          <div 
            className="clay-glass"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
              width: '90%',
              maxWidth: '520px',
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
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-wire-gold)', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>
              Unlock Market Intelligence
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-sage)', lineHeight: '1.65', fontFamily: 'var(--font-body)', margin: 0 }}>
              Connect your Web3 wallet and claim demo CINDER tokens to unlock real-time ETF flows, narrative analysis, and automated trade execution logs on SoDEX.
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
                marginTop: '6px'
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
