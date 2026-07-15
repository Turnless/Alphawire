'use client';

import React, { useState, useEffect } from 'react';

const NARRATIVE_NAMES = {
  NAR_01: 'Institutional Accumulation',
  NAR_02: 'Retail FOMO',
  NAR_03: 'Regulatory Storm',
  NAR_04: 'AI/Tech Rotation',
  NAR_05: 'DeFi Renaissance',
  NAR_06: 'Risk-Off Flight',
  NAR_07: 'L2/Infra Cycle',
  NAR_08: 'Black Swan',
};

export default function TemperatureGauge({ 
  temperature = null, 
  label = null, 
  diameter = 120 
}) {
  const [liveTemp, setLiveTemp] = useState(0);
  const [liveLabel, setLiveLabel] = useState('Market Temp');

  useEffect(() => {
    // If props are explicitly provided, use them and do not fetch
    if (temperature !== null && label !== null) {
      setLiveTemp(temperature);
      setLiveLabel(label);
      return;
    }

    const fetchLiveTemperature = async () => {
      try {
        const res = await fetch('/api/narrative');
        const json = await res.json();
        if (json.success && json.temperatures) {
          // Find narrative with the highest temperature
          let maxTemp = -1;
          let maxId = 'NAR_01';
          Object.entries(json.temperatures).forEach(([id, data]) => {
            if (data.temperature > maxTemp) {
              maxTemp = data.temperature;
              maxId = id;
            }
          });
          setLiveTemp(maxTemp >= 0 ? maxTemp : 0);
          setLiveLabel(NARRATIVE_NAMES[maxId] || 'Market Temp');
        }
      } catch (e) {
        console.error('Failed to fetch narrative temperature for gauge:', e);
      }
    };

    fetchLiveTemperature();
    const interval = setInterval(fetchLiveTemperature, 15000);
    return () => clearInterval(interval);
  }, [temperature, label]);

  const roundedTemp = Math.round(liveTemp);
  const strokeWidth = 8;
  const radius = (diameter / 2) - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, liveTemp)) / 100) * circumference;

  // Determine arc progress color
  let progressColor = 'var(--color-sage)';
  let filterGlow = 'none';

  if (liveTemp >= 80) {
    progressColor = 'var(--color-shift-red)';
    filterGlow = 'url(#gauge-glow-red)';
  } else if (liveTemp >= 60) {
    progressColor = 'var(--color-alert-amber)';
  } else if (liveTemp >= 40) {
    progressColor = 'var(--color-data-blue)';
  }

  // Font sizes scale with gauge diameter
  const valueFontSize = diameter >= 180 ? '2.5rem' : '1.5rem';
  const labelFontSize = diameter >= 180 ? '0.78rem' : '0.68rem';

  return (
    <div className="gauge-container" style={{ width: diameter, height: diameter, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
        <defs>
          {/* Red Glow Filter for Narrative Shifts (>80 degrees) */}
          <filter id="gauge-glow-red" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComponentTransfer in="blur" result="glow">
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Track Ring */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="var(--color-iron)"
          strokeWidth={strokeWidth}
        />

        {/* Foreground Progress Arc */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
          filter={filterGlow}
          style={{ transition: 'stroke-dashoffset 1.2s ease-in-out' }}
        />
      </svg>

      {/* Center Absolute Label Panel */}
      <div 
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        <span 
          style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 700, 
            fontSize: valueFontSize, 
            color: 'var(--color-linen)',
            lineHeight: 1
          }}
        >
          {roundedTemp}°
        </span>
        <span 
          style={{ 
            fontFamily: 'var(--font-body)', 
            fontSize: labelFontSize, 
            color: 'var(--color-sage)',
            marginTop: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            maxWidth: diameter - 32,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {liveLabel}
        </span>
      </div>
    </div>
  );
}
