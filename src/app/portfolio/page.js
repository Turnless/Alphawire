import Header from '../../components/shared/Header';
import PortfolioView from '../../components/trading/PortfolioView';
import TradeHistory from '../../components/trading/TradeHistory';
import RiskDashboard from '../../components/trading/RiskDashboard';
import QuickTrade from '../../components/trading/QuickTrade';

export default function PortfolioPage() {
  return (
    <main>
      <Header />
      <div className="container portfolio">
        <h1>SoDEX Portfolio & Risk Management</h1>
        <div className="portfolio-grid">
          <div className="portfolio-col-8">
            <PortfolioView />
            <TradeHistory />
          </div>
          <div className="portfolio-col-4">
            <QuickTrade />
            <RiskDashboard />
          </div>
        </div>
      </div>
    </main>
  );
}
