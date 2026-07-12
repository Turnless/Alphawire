import Header from '../components/shared/Header';
import StoryFeed from '../components/wire/StoryFeed';
import TemperatureGauge from '../components/narrative/TemperatureGauge';

export default function HomePage() {
  return (
    <main>
      <Header />
      <div className="container">
        <h1>AlphaWire Live Feed</h1>
        <div className="feed-layout">
          <div className="feed-column">
            <StoryFeed />
          </div>
          <div className="sidebar-column">
            <TemperatureGauge />
          </div>
        </div>
      </div>
    </main>
  );
}
