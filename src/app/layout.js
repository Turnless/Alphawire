import '../styles/globals.css';

export const metadata = {
  title: '⚡ AlphaWire | Autonomous Market News & Execution',
  description: 'AI-generated market intelligence and narrative regime shift trading platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="dark-theme">
        {children}
      </body>
    </html>
  );
}
