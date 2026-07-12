import Header from '../../../components/shared/Header';

export default function StoryDetailPage({ params }) {
  const { id } = params;

  return (
    <main>
      <Header />
      <div className="container story-detail">
        <h1>Story Detail Page (ID: {id})</h1>
        {/* Story body markdown and related charts will render here */}
      </div>
    </main>
  );
}
