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

  const featuredStory = sortedStories[0];
  const trendingStories = sortedStories.slice(1, 3);
  const remainingStories = sortedStories.slice(3);

  return (
    <div className="story-feed-wrapper">
      <div className="feed-header-row">
        <h2 className="feed-title" style={{ visibility: 'hidden', height: 0, margin: 0, padding: 0 }}>Latest Stories</h2>
        <span className="feed-count">{stories.length} intelligence reports online</span>
      </div>

      <AnimatePresence mode="popLayout">
        <div className="edge-news-portal">
          
          {/* Top Feature Grid: Main Hero (Left) & Trending Stack (Right) */}
          <div className="edge-feature-grid">
            {/* Left Hero Card */}
            {featuredStory && (
              <motion.div
                key={featuredStory.id}
                variants={itemVariants}
                initial="hidden"
                animate="show"
                layout
              >
                <div style={{ height: '100%' }}>
                  <StoryCard story={featuredStory} />
                </div>
              </motion.div>
            )}

            {/* Right Trending Stack */}
            {trendingStories.length > 0 && (
              <div className="edge-trending-column">
                {trendingStories.map((story) => (
                  <motion.div
                    key={story.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    layout
                  >
                    <StoryCard story={story} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-grid of remaining news stories below the fold */}
          {remainingStories.length > 0 && (
            <motion.div 
              className="edge-sub-grid"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              layout
            >
              {remainingStories.map((story) => (
                <motion.div
                  key={story.id}
                  variants={itemVariants}
                  layout
                >
                  <StoryCard story={story} />
                </motion.div>
              ))}
            </motion.div>
          )}

        </div>
      </AnimatePresence>

      {hasMore && (
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
