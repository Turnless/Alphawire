'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StoryCard from './StoryCard';
import { useWallet } from '../../context/WalletContext';

const spring = { type: 'spring', stiffness: 280, damping: 24 };

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: spring }
};

export default function StoryFeed() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);
  
  const { isConnected, connectWallet } = useWallet();

  // Fetch stories on load and page change
  const fetchStories = async (pageNum, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const limit = 10;
      const offset = (pageNum - 1) * limit;

      const res = await fetch(`/api/stories?offset=${offset}&limit=${limit}`);
      const data = await res.json();

      if (data.success) {
        setStories(prev => {
          if (append) {
            const existingIds = new Set(prev.map(s => s.id));
            const newStories = data.stories.filter(s => !existingIds.has(s.id));
            return [...prev, ...newStories];
          } else {
            return data.stories;
          }
        });
        
        const total = data.pagination?.total || 0;
        setHasMore(offset + (data.stories?.length || 0) < total);
      } else {
        setError(data.error || 'Failed to retrieve stories');
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchStories(1, false);
  }, []);

  // Listen to live SSE updates
  useEffect(() => {
    let eventSource;
    let reconnectTimeout;

    function connectSSE() {
      try {
        eventSource = new EventSource('/api/stories/stream');

        eventSource.onmessage = (event) => {
          try {
            const newStory = JSON.parse(event.data);
            setStories(prev => {
              if (prev.some(s => s.id === newStory.id)) {
                return prev;
              }
              return [newStory, ...prev];
            });
          } catch (e) {
            console.error('Error parsing live story:', e);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          reconnectTimeout = setTimeout(connectSSE, 10000);
        };
      } catch (err) {
        console.error('Error establishing SSE stream:', err);
        reconnectTimeout = setTimeout(connectSSE, 10000);
      }
    }

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStories(nextPage, true);
  };

  // Premium Shimmer Loading Skeletons
  const renderSkeletons = () => (
    <div className="story-feed">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="story-card-skeleton">
          <div className="skeleton-header">
            <div className="skeleton-badge shimmer"></div>
            <div className="skeleton-date shimmer"></div>
          </div>
          <div className="skeleton-title shimmer"></div>
          <div className="skeleton-summary shimmer"></div>
          <div className="skeleton-line shimmer"></div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="story-feed-wrapper">
        <h3 className="feed-title">Loading stories...</h3>
        {renderSkeletons()}
      </div>
    );
  }

  if (error && stories.length === 0) {
    return (
      <div className="feed-error-state clay-glass">
        <h4>Could not load stories</h4>
        <p>{error}</p>
        <button className="btn-hero-primary" onClick={() => fetchStories(1, false)}>
          Retry
        </button>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="feed-empty-state clay-glass">
        <h4>No stories yet</h4>
        <p>Nothing has been published yet. Check back soon.</p>
      </div>
    );
  }

  const sortedStories = stories
    .slice()
    .sort((a, b) => {
      if (a.type === 'breaking' && b.type !== 'breaking') return -1;
      if (a.type !== 'breaking' && b.type === 'breaking') return 1;
      return new Date(b.published_at) - new Date(a.published_at);
    });

  // Limit display stories to 3 if disconnected (1 visible, 2 blurred)
  const visibleStories = isConnected ? sortedStories : sortedStories.slice(0, 3);

  return (
    <div className="story-feed-wrapper">
      <div className="feed-header-row">
        <h2 className="feed-title">Latest Stories</h2>
        <span className="feed-count">{stories.length} reports loaded</span>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div 
          className="story-feed" 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          layout
        >
          {visibleStories.map((story, index) => {
            const isBlurred = !isConnected && index > 0;
            return (
              <motion.div
                key={story.id}
                variants={itemVariants}
                layout
                style={isBlurred ? { filter: 'blur(8px)', pointerEvents: 'none', opacity: 0.35, userSelect: 'none' } : {}}
              >
                <StoryCard story={story} />
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Disconnected Feed Gate Overlay */}
      {!isConnected && stories.length > 1 && (
        <div 
          className="clay-glass"
          style={{
            marginTop: '24px',
            padding: '40px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            border: '1px solid rgba(212, 168, 83, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212, 168, 83, 0.15)',
            borderRadius: '20px'
          }}
        >
          <div style={{ fontSize: '1.6rem', color: 'var(--color-wire-gold)', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            Unlock Live Intelligence Feed
          </div>
          <p style={{ maxWidth: '500px', fontSize: '0.88rem', color: 'var(--color-sage)', lineHeight: '1.6', fontFamily: 'var(--font-body)' }}>
            Connect your Web3 wallet and claim demo CINDER tokens to unlock real-time ETF flows, narrative analysis, and automated trade execution logs on SoDEX.
          </p>
          <button 
            onClick={() => connectWallet()}
            className="btn-hero-primary"
            style={{ 
              padding: '12px 32px', 
              fontSize: '0.85rem', 
              fontWeight: 700, 
              borderRadius: '12px',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              marginTop: '8px'
            }}
          >
            Connect Wallet to Unlock
          </button>
        </div>
      )}

      {isConnected && hasMore && (
        <div className="load-more-container">
          <button 
            className="btn-hero-secondary" 
            onClick={handleLoadMore} 
            disabled={loadingMore}
            style={{ width: '100%', maxWidth: '320px' }}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
