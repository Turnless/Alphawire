'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const NARRATIVES_METADATA = {
  'NAR_01': { name: 'Institutional Accumulation', color: '#007aff', desc: 'Large-scale capital entry via ETFs & custodians' },
  'NAR_02': { name: 'Retail FOMO', color: '#ff9500', desc: 'Accelerating retail buy volume and viral social activity' },
  'NAR_03': { name: 'Regulatory Storm', color: '#ff3b30', desc: 'SEC/government compliance actions & policy changes' },
  'NAR_04': { name: 'AI/Tech Rotation', color: '#00f0ff', desc: 'Capital migrating into AI & computational networks' },
  'NAR_05': { name: 'DeFi Renaissance', color: '#34c759', desc: 'Yield activity, TVL expansion & protocol usage' },
  'NAR_06': { name: 'Risk-Off Flight', color: '#8e44ad', desc: 'Capital flight to stablecoins and de-leveraging' },
  'NAR_07': { name: 'L2/Infra Cycle', color: '#f1c40f', desc: 'Core infrastructure upgrades and L2 rollup activity' },
  'NAR_08': { name: 'Black Swan', color: '#e74c3c', desc: 'Extreme security exploits, insolvencies, or anomalies' }
};

export default function BubbleMap({ temperatures = {} }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Get current dimensions
    const width = containerRef.current.clientWidth || 600;
    const height = 450;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Prepare data
    const nodes = Object.keys(NARRATIVES_METADATA).map(id => {
      const details = temperatures[id] || { temperature: 30, newsScore: 30, flowScore: 30, sectorScore: 30 };
      const temp = Math.max(10, Math.min(100, details.temperature));
      return {
        id,
        name: NARRATIVES_METADATA[id].name,
        desc: NARRATIVES_METADATA[id].desc,
        color: NARRATIVES_METADATA[id].color,
        temperature: temp,
        newsScore: details.newsScore || 0,
        flowScore: details.flowScore || 0,
        sectorScore: details.sectorScore || 0,
        r: 35 + (temp * 0.45) // Radius scales between 35px and 80px
      };
    });

    // Create SVG container attributes
    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'background-color: transparent;');

    // Setup force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('x', d3.forceX(width / 2).strength(0.08))
      .force('y', d3.forceY(height / 2).strength(0.08))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.r + 12).strength(0.85))
      .alphaDecay(0.02)
      .alpha(1);

    // Create groups for each bubble
    const elem = svg.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('stroke-width', 3)
          .attr('stroke', '#ffffff')
          .attr('filter', 'url(#glow)');
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('circle')
          .transition()
          .duration(200)
          .attr('stroke-width', 1.5)
          .attr('stroke', d.color)
          .attr('filter', 'none');
      });

    // Add filter definition for glow effect
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', 5)
      .attr('result', 'blur');
    const merge = glowFilter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Append circles
    elem.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => {
        // Temperature-dependent opacity for background colors
        const opacity = 0.15 + (d.temperature / 100) * 0.45;
        return `${d.color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
      })
      .attr('stroke', d => d.color)
      .attr('stroke-width', 1.5);

    // Add pulsing center core representing current temperature
    elem.append('circle')
      .attr('r', d => Math.max(4, d.r * 0.12))
      .attr('fill', d => d.color)
      .style('opacity', 0.8)
      .style('animation', 'pulse 2s infinite ease-in-out');

    // Add text labels (narrative name wrapped)
    elem.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-5px')
      .style('fill', 'var(--text-primary)')
      .style('font-size', d => `${Math.max(10, d.r * 0.16)}px`)
      .style('font-weight', '600')
      .style('pointer-events', 'none')
      .text(d => {
        const words = d.name.split(' ');
        return words[0] || '';
      });

    elem.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '10px')
      .style('fill', 'var(--text-primary)')
      .style('font-size', d => `${Math.max(10, d.r * 0.16)}px`)
      .style('font-weight', '600')
      .style('pointer-events', 'none')
      .text(d => {
        const words = d.name.split(' ');
        return words.slice(1).join(' ') || '';
      });

    // Add temperature badge text
    elem.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '26px')
      .style('fill', 'var(--text-secondary)')
      .style('font-size', d => `${Math.max(9, d.r * 0.15)}px`)
      .style('font-weight', '800')
      .style('pointer-events', 'none')
      .text(d => `${d.temperature.toFixed(0)}°C`);

    // Drag-and-drop forces
    elem.call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    );

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Tick function to update positions
    function ticked() {
      // Keep circles within bounds
      elem.attr('transform', d => {
        const r = d.r;
        const x = Math.max(r + 10, Math.min(width - r - 10, d.x));
        const y = Math.max(r + 10, Math.min(height - r - 10, d.y));
        d.x = x;
        d.y = y;
        return `translate(${x}, ${y})`;
      });
    }

    // Run simulation
    simulation.on('tick', ticked);

    return () => {
      simulation.stop();
    };
  }, [temperatures]);

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center position-relative">
      <div className="text-center mb-2">
        <span className="text-xs text-secondary font-medium tracking-wide uppercase">Interactive Regime Map (Click node to inspect)</span>
      </div>

      <div className="w-full bg-[#12161f] border border-[#242b3b] rounded-lg overflow-hidden relative shadow-lg">
        <svg ref={svgRef}></svg>

        {/* Selected Narrative Detail Overlay */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 bg-[#1b212f] border border-[#242b3b] p-4 rounded-lg shadow-xl animate-fade-in text-sm text-[#f0f2f5] z-10">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-base flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                  {selectedNode.name}
                </h4>
                <p className="text-xs text-[#8c9ba5] italic mt-0.5">{selectedNode.desc}</p>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-xs text-[#8c9ba5] hover:text-[#f0f2f5] bg-[#242b3b] px-2 py-1 rounded"
              >
                Close
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-[#242b3b] text-center">
              <div>
                <div className="text-xs text-[#8c9ba5] uppercase font-bold tracking-wider">Overall</div>
                <div className="text-lg font-extrabold text-[#f0f2f5] mt-1">{selectedNode.temperature.toFixed(1)}°</div>
              </div>
              <div>
                <div className="text-xs text-[#8c9ba5] uppercase font-bold tracking-wider">News</div>
                <div className="text-lg font-bold text-[#00f0ff] mt-1">{selectedNode.newsScore.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-[#8c9ba5] uppercase font-bold tracking-wider">ETF Flows</div>
                <div className="text-lg font-bold text-[#ff9500] mt-1">{selectedNode.flowScore.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-xs text-[#8c9ba5] uppercase font-bold tracking-wider">Sectors</div>
                <div className="text-lg font-bold text-[#34c759] mt-1">{selectedNode.sectorScore.toFixed(0)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
