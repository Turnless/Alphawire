'use client';

import { useState, useEffect } from 'react';

export default function LiveIndicator() {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let eventSource;
    let reconnectTimeout;
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      try {
        eventSource = new EventSource('/api/stories/stream');

        eventSource.onopen = () => {
          if (isMounted) setIsLive(true);
        };

        eventSource.onerror = (err) => {
          if (isMounted) {
            setIsLive(false);
            eventSource.close();
            // Try reconnecting after 5 seconds
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (e) {
        if (isMounted) {
          setIsLive(false);
          reconnectTimeout = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return (
    <div className={`live-indicator ${isLive ? 'active' : 'disconnected'}`}>
      <span className="pulse-dot"></span>
      <span className="status-text">{isLive ? 'LIVE' : 'OFFLINE'}</span>
    </div>
  );
}
