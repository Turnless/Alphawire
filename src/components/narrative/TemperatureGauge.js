'use client';

import React from 'react';

export default function TemperatureGauge({ 
  temperature = 0, 
  label = 'Current Regime', 
  newsScore = null, 
  flowScore = null, 
  sectorScore = null 
}) {
  const roundedTemp = Math.round(temperature * 10) / 10;
  
  // Base circle path definitions for 180-degree gauge
  const radius = 60;
  const circumference = Math.PI * radius; // 188.49
  const progressOffset = circumference - (Math.min(100, Math.max(0, temperature)) / 100) * circumference;

  // Determine dynamic accent color
  let accentColor = '#00f0ff'; // Cyan (cold)
  let statusText = 'COLD';
  if (temperature >= 75) {
    accentColor = '#ff3b30'; // Red (hot regime shift territory)
    statusText = 'HEATED';
  } else if (temperature >= 40) {
    accentColor = '#ff9500'; // Orange (warm)
    statusText = 'WARM';
  }

  // Calculate needle position
  // Angle runs from Math.PI (left, 0%) to 0 (right, 100%)
  const rad = Math.PI - (Math.min(100, Math.max(0, temperature)) / 100) * Math.PI;
  const needleLength = 48;
  const needleX = 75 + needleLength * Math.cos(rad);
  const needleY = 75 - needleLength * Math.sin(rad);

  return (
    <div className="temperature-gauge-card border border-[#242b3b] rounded-lg bg-[#12161f] p-5 shadow-lg flex flex-col items-center justify-center text-center">
      <span className="text-xs font-bold text-[#8c9ba5] uppercase tracking-wider mb-2">{label}</span>
      
      {/* SVG Dial */}
      <div className="relative w-40 h-24 mb-2 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 150 90">
          <defs>
            {/* Glow filter for the dynamic arc */}
            <filter id={`gauge-glow-${accentColor.replace('#', '')}`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComponentTransfer in="blur" result="glow1">
                <feFuncA type="linear" slope="0.6" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Arc Track */}
          <path
            d="M 15 75 A 60 60 0 0 1 135 75"
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Foreground Active Arc */}
          <path
            d="M 15 75 A 60 60 0 0 1 135 75"
            fill="none"
            stroke={accentColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            filter={`url(#gauge-glow-${accentColor.replace('#', '')})`}
            className="transition-all duration-1000 ease-out"
          />

          {/* Needle Pin Base */}
          <circle cx="75" cy="75" r="5" fill="#f0f2f5" />
          <circle cx="75" cy="75" r="2" fill={accentColor} />

          {/* Rotating Needle Line */}
          <line
            x1="75"
            y1="75"
            x2={needleX}
            y2={needleY}
            stroke="#f0f2f5"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Readout in center of gauge */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className="text-2xl font-black text-[#f0f2f5] tracking-tight">{roundedTemp.toFixed(1)}°</span>
          <span 
            className="text-[10px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-full mt-0.5"
            style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Sub-scores detailed map if present */}
      {(newsScore !== null || flowScore !== null || sectorScore !== null) && (
        <div className="w-full grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-[#242b3b] text-center text-xs">
          {newsScore !== null && (
            <div className="flex flex-col">
              <span className="text-[#8c9ba5] text-[10px] uppercase font-semibold">News</span>
              <span className="text-[#f0f2f5] font-bold mt-0.5">{Math.round(newsScore)}</span>
            </div>
          )}
          {flowScore !== null && (
            <div className="flex flex-col">
              <span className="text-[#8c9ba5] text-[10px] uppercase font-semibold">Flows</span>
              <span className="text-[#f0f2f5] font-bold mt-0.5">{Math.round(flowScore)}</span>
            </div>
          )}
          {sectorScore !== null && (
            <div className="flex flex-col">
              <span className="text-[#8c9ba5] text-[10px] uppercase font-semibold">Sectors</span>
              <span className="text-[#f0f2f5] font-bold mt-0.5">{Math.round(sectorScore)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
