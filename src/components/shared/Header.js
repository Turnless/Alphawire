'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LiveIndicator from './LiveIndicator';
import { useTheme } from './ThemeProvider';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <header className="site-header">
      <nav className="nav-container">
        <div className="logo-section">
          <Link href="/" className="logo-link">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">AlphaWire</span>
          </Link>
          <LiveIndicator />
        </div>
        
        <div className="nav-right">
          <ul className="nav-links">
            <li>
              <Link href="/" className={pathname === '/' ? 'active' : ''}>
                Wire Feed
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
                Narrative Dashboard
              </Link>
            </li>
            <li>
              <Link href="/portfolio" className={pathname === '/portfolio' ? 'active' : ''}>
                Portfolio
              </Link>
            </li>
          </ul>
          
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
