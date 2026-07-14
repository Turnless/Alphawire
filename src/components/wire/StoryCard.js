'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import FlowChart from './FlowChart';
import SectorHeatmap from './SectorHeatmap';

// Map of narrative IDs to readable labels
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

// Custom Markdown Parser
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  html = html.replace(/\r\n/g, '\n');
  
  // Tables
  const lines = html.split('\n');
  let inTable = false;
  let tableRows = [];
  let processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
    } else {
      if (inTable) {
        processedLines.push(convertTableToHTML(tableRows));
        inTable = false;
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable) {
    processedLines.push(convertTableToHTML(tableRows));
  }
  
  html = processedLines.join('\n');
  
  // Headings
  html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  
  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Inline Code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Lists
  const listProcessedLines = [];
  let inList = false;
  const finalLines = html.split('\n');
  
  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i];
    const match = line.match(/^[-*]\s+(.*)$/);
    if (match) {
      if (!inList) {
        listProcessedLines.push('<ul>');
        inList = true;
      }
      listProcessedLines.push(`<li>${match[1]}</li>`);
    } else {
      if (inList) {
        listProcessedLines.push('</ul>');
        inList = false;
      }
      listProcessedLines.push(line);
    }
  }
  if (inList) {
    listProcessedLines.push('</ul>');
  }
  
  const blocks = listProcessedLines.join('\n').split(/\n\n+/);
  const resultBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h') || 
      trimmed.startsWith('<ul') || 
      trimmed.startsWith('<table') || 
      trimmed.startsWith('<ol') || 
      trimmed.startsWith('<pre')
    ) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
  });
  
  return resultBlocks.join('\n');
}

function convertTableToHTML(rows) {
  if (rows.length < 2) return '';
  const headers = rows[0]
    .split('|')
    .slice(1, -1)
    .map(h => h.trim());
    
  let html = '<div style="overflow-x:auto; margin: 15px 0;"><table class="data-table"><thead><tr>';
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  const dataRows = rows.slice(2);
  dataRows.forEach(rowStr => {
    const row = rowStr
      .split('|')
      .slice(1, -1)
      .map(c => c.trim());
      
    html += '<tr>';
    for (let i = 0; i < headers.length; i++) {
      html += `<td>${row[i] || ''}</td>`;
    }
    html += '</tr>';
  });
  
  html += '</tbody></table></div>';
  return html;
}

function getRelativeTimeString(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Generate premium themed abstract gradients based on story hash/id
function getStoryGradient(id, type) {
  let color1 = 'rgba(60, 61, 55, 0.4)';
  let color2 = 'rgba(30, 32, 30, 0.95)';
  
  if (type === 'breaking') {
    color1 = 'rgba(239, 68, 68, 0.35)'; // shift red
  } else if (type === 'deep_dive') {
    color1 = 'rgba(212, 168, 83, 0.35)'; // wire gold
  } else if (type === 'pulse') {
    color1 = 'rgba(96, 165, 250, 0.35)'; // data blue
  }
  
  return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
}

export default function StoryCard({ story, isWide = false }) {
  const { id, type, title, body, summary, chart_data, narrative_state, published_at } = story;
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Interactive like / dislike system
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  useEffect(() => {
    // Generate a stable seed count based on story ID hash
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    setLikeCount(Math.abs(hash % 250) + 12);
  }, [id]);

  const handleLike = (e) => {
    e.stopPropagation();
    if (liked) {
      setLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
      if (disliked) {
        setDisliked(false);
      }
    }
  };

  const handleDislike = (e) => {
    e.stopPropagation();
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      if (liked) {
        setLiked(false);
        setLikeCount(prev => prev - 1);
      }
    }
  };

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const dateFormatted = new Date(published_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  });

  const relativeTime = getRelativeTimeString(published_at);
  const bgGradient = getStoryGradient(id, type);

  const renderBodyContent = () => {
    if (!body) return null;
    const parts = body.split(/(\[ETF Flow Trend Chart\]|\[Sector Heatmap\])/g);

    return parts.map((part, index) => {
      if (part === '[ETF Flow Trend Chart]') {
        return (
          <div key={index} className="clay-glass chart-container-card" style={{ padding: '20px', margin: '15px 0' }}>
            <FlowChart data={chart_data?.etf_flows || []} />
          </div>
        );
      }
      if (part === '[Sector Heatmap]') {
        return (
          <div key={index} className="clay-glass chart-container-card" style={{ padding: '20px', margin: '15px 0' }}>
            <SectorHeatmap sectors={chart_data?.sectors || []} />
          </div>
        );
      }

      const parsedHtml = parseMarkdown(part);
      return (
        <div 
          key={index} 
          className="story-markdown-body" 
          dangerouslySetInnerHTML={{ __html: parsedHtml }} 
        />
      );
    });
  };

  const renderNarrativeTags = () => {
    if (!narrative_state) return null;
    const parsedState = typeof narrative_state === 'string' 
      ? JSON.parse(narrative_state) 
      : narrative_state;

    const getTempColor = (t) => {
      if (t >= 80) return 'var(--color-shift-red)';
      if (t >= 50) return 'var(--color-wire-gold)';
      return 'var(--color-data-blue)';
    };

    return (
      <div className="narrative-tags-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
        {Object.entries(parsedState).map(([narId, temp]) => {
          const tempVal = parseFloat(temp);
          return (
            <span 
              key={narId} 
              className="narrative-tag"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                color: 'var(--color-sage)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(236,223,204,0.02)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(236,223,204,0.05)'
              }}
            >
              <span className="narrative-tag-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: getTempColor(tempVal) }} />
              {NARRATIVE_NAMES[narId] || narId} {tempVal.toFixed(0)}°
            </span>
          );
        })}
      </div>
    );
  };

  const handleToggle = (e) => {
    if (e.metaKey || e.ctrlKey || e.button === 1) return;
    e.preventDefault();
    setIsModalOpen(!isModalOpen);
  };

  return (
    <>
      <article 
        className={`edge-card-base ${isWide ? 'edge-card-span-2' : ''}`}
        onClick={handleToggle}
        style={{ cursor: 'pointer' }}
      >
        {isWide ? (
          /* Wide Cover Card Layout (Microsoft Edge Style Hero Card) */
          <div style={{ position: 'relative', height: '100%', minHeight: '320px' }}>
            <div 
              className="edge-card-wide-bg" 
              style={{ background: bgGradient }}
            />
            
            <div className="edge-cover-card-body">
              <div className="edge-card-source">
                <span className="edge-card-source-dot" style={{ backgroundColor: type === 'breaking' ? 'var(--color-shift-red)' : 'var(--color-wire-gold)' }} />
                <span>🔥 CINDER WIRE</span>
                <span>•</span>
                <span>{relativeTime}</span>
              </div>
              
              <h2 className="edge-cover-title">{title}</h2>
              {summary && <p className="edge-cover-desc">{summary}</p>}
              
              {renderNarrativeTags()}
            </div>
          </div>
        ) : (
          /* Standard Card Layout (Microsoft Edge News Feed Card) */
          <>
            <div className="edge-card-image" style={{ background: bgGradient }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.8 }}>
                <span className="logo-alpha" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: 'var(--color-linen)' }}>
                  Cin<span className="logo-wire" style={{ color: 'var(--color-wire-gold)' }}>der</span>
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  textTransform: 'uppercase',
                  color: 'var(--color-sage)',
                  border: '1px solid var(--glass-border)',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {type === 'breaking' ? 'Breaking Alert' : type === 'deep_dive' ? 'Deep Dive' : 'Market Pulse'}
                </span>
              </div>
            </div>

            <div className="edge-card-body">
              <div className="edge-card-source">
                <span className="edge-card-source-dot" style={{ backgroundColor: type === 'breaking' ? 'var(--color-shift-red)' : 'var(--color-wire-gold)' }} />
                <span>🔥 CINDER INTEL</span>
                <span>•</span>
                <span>{relativeTime}</span>
              </div>

              <h3 className="edge-card-title">{title}</h3>
              {summary && <p className="edge-card-desc">{summary}</p>}
              {renderNarrativeTags()}
            </div>
          </>
        )}

        {/* Universal Footer for Thumbs and Navigation */}
        <div className="edge-card-footer" onClick={(e) => e.stopPropagation()}>
          <div className="edge-card-social">
            <button 
              className="edge-social-btn" 
              onClick={handleLike}
              style={{ color: liked ? 'var(--color-wire-gold)' : 'var(--color-sage)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span>{likeCount}</span>
            </button>
            <button 
              className="edge-social-btn" 
              onClick={handleDislike}
              style={{ color: disliked ? 'var(--color-shift-red)' : 'var(--color-sage)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={disliked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-7h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
              </svg>
            </button>
          </div>

          <a href={`/story/${id}`} onClick={handleToggle} className="story-read-link" style={{ fontSize: '0.78rem', color: 'var(--color-wire-gold)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <span>Read Report</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </article>

      {/* Render detailed full-screen modal exactly as before */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="story-modal-wrapper-fixed" style={{ zIndex: 2000 }}>
            <motion.div 
              className="story-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
            />

            <motion.div 
              className="story-modal-content clay-glass"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            >
              <div className="story-modal-header">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="story-modal-back-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 8H2M2 8L7 13M2 8L7 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Back to Feed</span>
                </button>

                <div className="story-meta-right">
                  <span className={`story-type-badge ${type}`}>
                    <span className="story-badge-dot" />
                    {type === 'breaking' && 'Breaking'}
                    {type === 'deep_dive' && 'Deep Dive'}
                    {type === 'pulse' && 'Market Pulse'}
                  </span>
                  <time className="story-date" title={dateFormatted}>{relativeTime}</time>
                </div>
              </div>

              <div className="story-modal-scroll-area">
                <h1 className="story-modal-title">{title}</h1>
                {summary && <p className="story-modal-subhead">{summary}</p>}

                {type === 'breaking' && chart_data?.execution && (
                  <div className="clay-glass breaking-execution-banner" style={{ margin: '20px 0', borderLeft: '3px solid var(--color-shift-red)' }}>
                    <div className="execution-banner-title" style={{ fontSize: '0.82rem', color: 'var(--color-shift-red)', fontWeight: 700, marginBottom: '8px' }}>EXECUTION DETAILS</div>
                    <div className="execution-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '0.82rem' }}>
                      <div>
                        <span className="execution-detail-label" style={{ color: 'var(--color-sage)' }}>Asset Pair:</span>{' '}
                        <span className="execution-detail-value" style={{ color: 'var(--color-linen)', fontWeight: 600 }}>{chart_data.execution.pair}</span>
                      </div>
                      <div>
                        <span className="execution-detail-label" style={{ color: 'var(--color-sage)' }}>Side:</span>{' '}
                        <span className="execution-detail-value" style={{ color: 'var(--color-linen)', fontWeight: 600 }}>{chart_data.execution.side}</span>
                      </div>
                      <div>
                        <span className="execution-detail-label" style={{ color: 'var(--color-sage)' }}>Qty:</span>{' '}
                        <span className="execution-detail-value" style={{ color: 'var(--color-linen)', fontWeight: 600 }}>{chart_data.execution.qty}</span>
                      </div>
                      <div>
                        <span className="execution-detail-label" style={{ color: 'var(--color-sage)' }}>Price:</span>{' '}
                        <span className="execution-detail-value" style={{ color: 'var(--color-linen)', fontWeight: 600 }}>${parseFloat(chart_data.execution.price || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="story-modal-body-content" style={{ borderTop: '1px solid rgba(236, 223, 204, 0.08)', paddingTop: '20px' }}>
                  {renderBodyContent()}
                </div>

                <div className="story-modal-footer-tags" style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(236, 223, 204, 0.08)' }}>
                  <div className="story-modal-footer-label" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-sage)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impacted Narratives:</div>
                  {renderNarrativeTags()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
