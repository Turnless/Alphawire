'use client';

import { useState, useEffect } from 'react';

export default function LiveIndicator() {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    // SSE hook stub to update live indicator state
    setIsLive(true);
  }, []);

  return (
    <div className={`live-indicator ${isLive ? 'active' : ''}`}>
      <span className="pulse-dot"></span>
      <span className="status-text">{isLive ? 'LIVE' : 'DISCONNECTED'}</span>
    </div>
  );
}
