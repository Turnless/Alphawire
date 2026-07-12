'use client';

export default function SectorHeatmap({ sectors }) {
  if (!sectors || sectors.length === 0) {
    return (
      <div className="heatmap-empty-state">
        <span className="empty-icon">🗺️</span>
        <p>No sector performance data available.</p>
      </div>
    );
  }

  return (
    <div className="sector-heatmap-grid">
      {sectors.map((sectorData, index) => {
        const perf = sectorData.performance_7d || 0;
        const isPositive = perf >= 0;
        
        // Calculate background opacity based on performance strength (cap at 25% for max density)
        const strength = Math.min(Math.abs(perf) / 25, 1);
        const bgColor = isPositive
          ? `rgba(52, 199, 89, ${0.05 + strength * 0.15})`
          : `rgba(255, 59, 48, ${0.05 + strength * 0.15})`;
        
        const borderColor = isPositive
          ? `rgba(52, 199, 89, ${0.1 + strength * 0.3})`
          : `rgba(255, 59, 48, ${0.1 + strength * 0.3})`;
        
        const textColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';

        return (
          <div 
            key={index} 
            className="sector-tile"
            style={{ 
              backgroundColor: bgColor,
              borderColor: borderColor
            }}
          >
            <div className="sector-tile-header">
              <span className="sector-name">{sectorData.sector}</span>
              <span className="sector-perf-badge" style={{ color: textColor }}>
                {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{perf.toFixed(1)}%
              </span>
            </div>
            
            <div className="sector-tile-body">
              <div className="sector-meta-row">
                <span className="meta-label">30d Return</span>
                <span className="meta-val">
                  {(sectorData.performance_30d || 0) >= 0 ? '+' : ''}
                  {(sectorData.performance_30d || 0).toFixed(1)}%
                </span>
              </div>
              <div className="sector-meta-row">
                <span className="meta-label">BTC Correlation</span>
                <span className="meta-val correlation">
                  {(sectorData.correlation_btc !== undefined && sectorData.correlation_btc !== null)
                    ? sectorData.correlation_btc.toFixed(2)
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
