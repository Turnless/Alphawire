import '../styles/globals.css';
import '../styles/wire.css';
import '../styles/dashboard.css';
import '../styles/portfolio.css';
import { ThemeProvider } from '../components/shared/ThemeProvider';

export const metadata = {
  title: '⚡ AlphaWire | Autonomous Market News & Execution',
  description: 'AI-generated market intelligence and narrative regime shift trading platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </html>
  );
}
