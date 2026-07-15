'use client';

import { useState, useEffect } from 'react';

export default function LiveIndicator() {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let interval;
    let isMounted = true;

    async function checkLive() {
      try {
        const res = await fetch('/api/stories/stream', { method: 'HEAD' });
        if (isMounted) setIsLive(res.ok);
      } catch {
        if (isMounted) setIsLive(false);
      }
    }

    checkLive();
    interval = setInterval(checkLive, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`live-indicator ${isLive ? 'active' : 'disconnected'}`}>
      <span className="pulse-dot"></span>
      <span className="status-text">{isLive ? 'LIVE' : 'OFFLINE'}</span>
    </div>
  );
}
