import Header from '../../components/shared/Header';
import BubbleMap from '../../components/narrative/BubbleMap';
import Timeline from '../../components/narrative/Timeline';
import ShiftAlert from '../../components/narrative/ShiftAlert';

export default function DashboardPage() {
  return (
    <main>
      <Header />
      <div className="container dashboard">
        <h1>Narrative Intelligence Dashboard</h1>
        <div className="dashboard-grid">
          <div className="main-viz">
            <BubbleMap />
          </div>
          <div className="alert-side">
            <ShiftAlert />
          </div>
        </div>
        <div className="timeline-section">
          <Timeline />
        </div>
      </div>
    </main>
  );
}
