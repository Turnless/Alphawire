import '../styles/globals.css';
import '../styles/wire.css';
import '../styles/dashboard.css';
import '../styles/portfolio.css';
import { WalletProvider } from '../context/WalletContext';

export const metadata = {
  title: 'Cinder | Autonomous Market News & Execution',
  description: 'AI-generated market intelligence with autonomous narrative-driven trade execution.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
