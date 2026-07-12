'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LiveIndicator from './LiveIndicator';
import { useWallet } from '../../context/WalletContext';

export default function Header() {
  const pathname = usePathname();
  const { 
    isConnected, 
    walletAddress, 
    balance, 
    isConnecting, 
    isClaiming, 
    connectWallet, 
    disconnectWallet, 
    claimFaucet 
  } = useWallet();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const shortAddress = walletAddress 
    ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` 
    : '';

  const handleConnectClick = (provider) => {
    connectWallet(provider);
    setShowConnectModal(false);
  };

  return (
    <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      <nav className="nav-container">
        <div className="logo-section">
          <Link href="/" className="logo-link">
            <span className="logo-alpha">Cin</span>
            <span className="logo-wire">der</span>
          </Link>
          <LiveIndicator />
        </div>
        
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <ul className="nav-links">
            <li>
              <Link href="/" className={pathname === '/' ? 'active' : ''}>
                Feed
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/portfolio" className={pathname === '/portfolio' ? 'active' : ''}>
                Portfolio
              </Link>
            </li>
          </ul>
          
          <div style={{ position: 'relative' }}>
            {isConnected ? (
              <div 
                className="wallet-pill clay-glass" 
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 12px', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid rgba(212, 168, 83, 0.25)',
                  backgroundColor: 'rgba(60, 61, 55, 0.45)',
                  userSelect: 'none'
                }}
              >
                <span style={{ color: 'var(--color-wire-gold)', fontWeight: 700 }}>
                  {balance.toLocaleString()} CNDR
                </span>
                <span style={{ width: '1px', height: '12px', backgroundColor: 'var(--glass-border)' }}></span>
                <span style={{ color: 'var(--color-linen)', opacity: 0.9 }}>
                  {shortAddress}
                </span>
              </div>
            ) : (
              <button 
                onClick={() => setShowConnectModal(!showConnectModal)}
                disabled={isConnecting}
                className="btn-launch"
                style={{ 
                  fontFamily: 'var(--font-body)', 
                  fontWeight: 600, 
                  fontSize: '0.8rem', 
                  padding: '8px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            {/* Wallet Dropdown Options */}
            {isConnected && showDropdown && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                  onClick={() => setShowDropdown(false)}
                />
                <div 
                  className="clay-glass"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '240px',
                    padding: '16px',
                    borderRadius: '16px',
                    zIndex: 999,
                    backgroundColor: 'var(--color-obsidian)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                  }}
                >
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-sage)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Active Wallet</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-linen)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{walletAddress}</div>
                  </div>

                  <button 
                    onClick={claimFaucet}
                    disabled={isClaiming}
                    className="clay-glass"
                    style={{ 
                      width: '100%', 
                      padding: '10px 0', 
                      borderRadius: '10px', 
                      backgroundColor: 'rgba(212, 168, 83, 0.08)', 
                      color: 'var(--color-wire-gold)', 
                      border: '1px solid rgba(212, 168, 83, 0.3)',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isClaiming ? (
                      <>
                        <span className="shimmer-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-wire-gold)', display: 'inline-block' }} />
                        <span>Claiming 1,000 CNDR...</span>
                      </>
                    ) : (
                      <span>Claim 1,000 Test CNDR</span>
                    )}
                  </button>

                  <button 
                    onClick={() => {
                      disconnectWallet();
                      setShowDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      borderRadius: '10px',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: 'var(--color-shift-red)',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </>
            )}

            {/* Connect Wallet Options Modal */}
            {showConnectModal && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                  onClick={() => setShowConnectModal(false)}
                />
                <div 
                  className="clay-glass"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '260px',
                    padding: '16px',
                    borderRadius: '16px',
                    zIndex: 999,
                    backgroundColor: 'var(--color-obsidian)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-sage)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600, borderBottom: '1px solid rgba(236,223,204,0.06)', paddingBottom: '6px' }}>Select Wallet Provider</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      onClick={() => handleConnectClick('MetaMask')}
                      className="clay-glass"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(236,223,204,0.06)',
                        background: 'rgba(236,223,204,0.02)',
                        color: 'var(--color-linen)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E2761B' }} />
                      <span>MetaMask</span>
                    </button>

                    <button 
                      onClick={() => handleConnectClick('WalletConnect')}
                      className="clay-glass"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(236,223,204,0.06)',
                        background: 'rgba(236,223,204,0.02)',
                        color: 'var(--color-linen)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B99FC' }} />
                      <span>WalletConnect</span>
                    </button>

                    <button 
                      onClick={() => handleConnectClick('Coinbase Wallet')}
                      className="clay-glass"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(236,223,204,0.06)',
                        background: 'rgba(236,223,204,0.02)',
                        color: 'var(--color-linen)',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0052FF' }} />
                      <span>Coinbase Wallet</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
