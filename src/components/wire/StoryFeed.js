'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StoryCard from './StoryCard';

export default function StoryFeed() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

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
            // Deduplicate stories
            const existingIds = new Set(prev.map(s => s.id));
            const newStories = data.stories.filter(s => !existingIds.has(s.id));
            return [...prev, ...newStories];
          } else {
            return data.stories;
          }
        });
        
        const total = data.pagination?.total || 0;
        const currentStoriesLength = append 
          ? (stories.length + (data.stories?.length || 0)) 
          : (data.stories?.length || 0);
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
              // Deduplicate live stories
              if (prev.some(s => s.id === newStory.id)) {
                return prev;
              }
              // Prepend new stories
              return [newStory, ...prev];
            });
          } catch (e) {
            console.error('Error parsing live story:', e);
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          // Try reconnecting in 10 seconds
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
    <div className="stories-loading-container">
      {[1, 2, 3].map((n) => (
        <div key={n} className="story-card-skeleton">
          <div className="skeleton-header">
            <div className="skeleton-badge shimmer"></div>
            <div className="skeleton-date shimmer"></div>
          </div>
          <div className="skeleton-title shimmer"></div>
          <div className="skeleton-summary shimmer"></div>
          <div className="skeleton-line shimmer"></div>
          <div className="skeleton-line short shimmer"></div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="story-feed-wrapper">
        <h3 className="feed-title">Connecting to Wire Service...</h3>
        {renderSkeletons()}
      </div>
    );
  }

  if (error && stories.length === 0) {
    return (
      <div className="feed-error-state">
        <span className="error-icon">⚠️</span>
        <h4>Failed to Load Wire Feed</h4>
        <p>{error}</p>
        <button className="retry-btn" onClick={() => fetchStories(1, false)}>
          Retry Connection
        </button>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="feed-empty-state">
        <span className="empty-icon">📭</span>
        <h4>Wire Feed is Empty</h4>
        <p>No stories have been published yet. Waiting for market shifts...</p>
      </div>
    );
  }

  return (
    <div className="story-feed-wrapper">
      <div className="feed-header-row">
        <h2 className="feed-title">Live Intelligence Feed</h2>
        <span className="feed-count">{stories.length} report{stories.length !== 1 ? 's' : ''} loaded</span>
      </div>

      <motion.div className="story-feed" layout>
        <AnimatePresence mode="popLayout">
          {stories.map((story) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              layout
            >
              <StoryCard story={story} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {hasMore && (
        <div className="load-more-container">
          <button 
            className="load-more-btn" 
            onClick={handleLoadMore} 
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading More Reports...' : 'Load More News'}
          </button>
        </div>
      )}
    </div>
  );
}
