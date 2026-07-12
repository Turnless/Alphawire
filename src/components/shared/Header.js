import Link from 'next/link';
import LiveIndicator from './LiveIndicator';

export default function Header() {
  return (
    <header className="site-header">
      <nav className="nav-container">
        <div className="logo-section">
          <Link href="/">
            <span className="logo-text">⚡ AlphaWire</span>
          </Link>
          <LiveIndicator />
        </div>
        <ul className="nav-links">
          <li><Link href="/">Wire Feed</Link></li>
          <li><Link href="/dashboard">Narrative Dashboard</Link></li>
          <li><Link href="/portfolio">Portfolio</Link></li>
        </ul>
      </nav>
    </header>
  );
}
