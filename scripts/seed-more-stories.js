const { createClient } = require('@libsql/client');

async function seed() {
  const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
  const client = createClient({ url });

  console.log('🌱 Seeding 12 custom financial wire stories to local.db...');

  const stories = [
    {
      id: 'story-1',
      type: 'breaking',
      title: 'DeFi Renaissance: Lending Protocols Surge As On-Chain Yields Double',
      summary: 'A massive rotation into DeFi governance tokens is underway as global liquidity spikes yields above 12% on blue-chip money markets.',
      body: 'Autonomous Analysis:\nWe have detected a sharp trend shift on DeFi sectors. On-chain lending volumes on Aave and Maker have grown by 34% over the last 48 hours. Yield configurations across USDC and DAI have surged past 12% APY, creating an attractive yield premium relative to traditional treasury yields.\n\n[Sector Heatmap]\n\nTrade rationale is fully established. Dispatched market orders to rebalance portfolio weights into DeFi index tokens.\n\n### Pre-Trade Verification Checklist\n- Daily loss limit verified: PASS\n- Exposure threshold checked: PASS\n- Target Allocation size: 25% of Portfolio',
      chart_data: JSON.stringify({
        sectors: [
          { name: 'DeFi Lending', change: 18.5 },
          { name: 'L1 Platforms', change: 2.1 },
          { name: 'L2 Rollups', change: 4.8 },
          { name: 'AI Tokens', change: -1.2 },
          { name: 'Meme Coins', change: -8.4 }
        ],
        execution: {
          pair: 'AAVE-USDC',
          side: 'BUY',
          qty: '185.40',
          price: '134.80'
        }
      }),
      narrative_state: JSON.stringify({ NAR_05: 84.5, NAR_01: 52.0, NAR_02: 38.0 }),
      published_at: new Date(Date.now() - 5 * 60000).toISOString() // 5m ago
    },
    {
      id: 'story-2',
      type: 'pulse',
      title: 'Market Pulse: ETF Flows Hit $420M Daily Net Inflows',
      summary: 'Institutions continue aggressive accumulation of Spot Bitcoin and Ethereum ETFs, keeping buy pressure sustained.',
      body: 'Market Intelligence Report:\nNet inflows into Spot Bitcoin ETFs totaled $420 million yesterday, marking the eighth consecutive day of positive net flows. BlackRock\'s IBIT took the lead with $280 million in net acquisitions, followed closely by Fidelity\'s FBTC at $110 million.\n\n[ETF Flow Trend Chart]\n\nInstitutional narrative remains strong at 88 degrees. Continuous support is expected to prevent deep downside corrections. No immediate portfolio rebalancing triggered.',
      chart_data: JSON.stringify({
        etf_flows: [
          { date: '2026-07-08', inflow: 120 },
          { date: '2026-07-09', inflow: 180 },
          { date: '2026-07-10', inflow: -40 },
          { date: '2026-07-11', inflow: 310 },
          { date: '2026-07-12', inflow: 290 },
          { date: '2026-07-13', inflow: 420 }
        ]
      }),
      narrative_state: JSON.stringify({ NAR_01: 88.0, NAR_04: 45.0 }),
      published_at: new Date(Date.now() - 25 * 60000).toISOString() // 25m ago
    },
    {
      id: 'story-3',
      type: 'deep_dive',
      title: 'Deep Dive: AI Token Sector Enters Cooling Phase After 90-Day Rally',
      summary: 'Data suggests speculative bubble conditions are easing in Artificial Intelligence projects as network utilization metrics stabilize.',
      body: 'Detailed Sector Breakdown:\nThe AI token sector has cooled down significantly from its peak narrative temperature of 92 degrees. Relational indicators show that while AI project market caps grew by 350% over the last quarter, underlying token utility (gas consumption, active developers, API calls) grew by only 22%.\n\n| Project | 90D Return | Active Addresses (YoY) |\n|---|---|---|\n| Render (RNDR) | +180% | +12% |\n| Fetch.ai (FET) | +240% | +18% |\n| SingularityNET (AGIX) | +110% | +8% |\n\nWe anticipate a consolidation wave moving forward. Capital is rotationally shifting into cash-flow producing protocols.',
      chart_data: null,
      narrative_state: JSON.stringify({ NAR_04: 58.0, NAR_05: 64.0 }),
      published_at: new Date(Date.now() - 75 * 60000).toISOString() // 1.25h ago
    },
    {
      id: 'story-4',
      type: 'breaking',
      title: 'Alert: Regulatory Wind Shifts As SEC Dismisses Key Money Market Actions',
      summary: 'Breaking: SEC formally ends investigation into decentralized liquidity pools, causing regulatory fear to evaporate.',
      body: 'Breaking Regulatory Update:\nThe SEC has filed to dismiss pending enforcement actions against decentralized liquidity pooling agreements. Legal experts cite recent appellate court rulings favoring code-as-speech arguments as the key driver for the regulatory retreat.\n\nThis marks a structural shift in risk premiums. Regulatory Storm narrative temperature has dropped from 78 to 35 degrees.\n\nCinder Risk Engine: Restored maximum single position allocation cap to 30%.',
      chart_data: null,
      narrative_state: JSON.stringify({ NAR_03: 35.0, NAR_05: 78.0 }),
      published_at: new Date(Date.now() - 140 * 60000).toISOString() // 2.3h ago
    },
    {
      id: 'story-5',
      type: 'pulse',
      title: 'Market Pulse: Layer-2 Gas Burn Sets All-Time Highs',
      summary: 'Base and Arbitrum capture 42% of all EVM transaction activity as rollups establish scale dominance.',
      body: 'L2 Scaling Metrics:\nGas consumption metrics for Layer-2 rollups have reached new heights, driven by gaming integrations and micro-trading terminals. Fee collection indices rose by 18.2% week-over-week, confirming solid organic user demand despite mainnet EVM upgrades.\n\n[Sector Heatmap]',
      chart_data: JSON.stringify({
        sectors: [
          { name: 'L2 Rollups', change: 12.4 },
          { name: 'DeFi Yields', change: 4.2 },
          { name: 'L1 Alternative', change: -2.3 },
          { name: 'Store of Value', change: 0.8 }
        ]
      }),
      narrative_state: JSON.stringify({ NAR_07: 76.0, NAR_01: 61.0 }),
      published_at: new Date(Date.now() - 240 * 60000).toISOString() // 4h ago
    },
    {
      id: 'story-6',
      type: 'deep_dive',
      title: 'Deep Dive: Cross-Chain Bridging Volumes Break Yearly Record',
      summary: 'Security integrations and zero-knowledge infrastructure drive a $1.2B surge in secure bridge transfers.',
      body: 'Technical Infrastructure Review:\nOn-chain bridge volumes have surged to $1.2 Billion. Zero-knowledge proof integrations have drastically lowered settlement delay costs, paving the way for seamless asset routing.\n\n| Protocol | Weekly Vol | Tx Success Rate |\n|---|---|---|\n| Hyperlane | $450M | 99.98% |\n| Across Protocol | $390M | 99.95% |\n| Wormhole | $360M | 99.85% |\n\nThis cross-chain liquidity consolidation supports general market stability and reduces slippage across multi-venue decentralized exchanges.',
      chart_data: null,
      narrative_state: JSON.stringify({ NAR_07: 68.0 }),
      published_at: new Date(Date.now() - 480 * 60000).toISOString() // 8h ago
    },
    {
      id: 'story-7',
      type: 'breaking',
      title: 'Alert: Global Tech Downtime Sparks Institutional Rotation Into BTC',
      summary: 'Breaking: Major cloud outage freezes traditional bank routing desks, driving capital into autonomous decentralized ledgers.',
      body: 'Outage Spillover Report:\nA massive global cloud outage has suspended electronic settlement systems across major traditional commercial banking venues. In response, private treasury managers are routing hedge allocations to Bitcoin and stablecoins.\n\n[Sector Heatmap]\n\nExecution triggers tripped. Placed market buy order for BTC-USDC to hedge structural financial venue risk.\n\n### Executed Trade Log:\n- Order: BUY 1.45 BTC\n- Price: $64,250.00\n- Total: $93,162.50 USDC\n- Status: FILLED',
      chart_data: JSON.stringify({
        sectors: [
          { name: 'Store of Value', change: 8.5 },
          { name: 'Stablecoins', change: 1.2 },
          { name: 'Traditional Finance', change: -12.6 }
        ],
        execution: {
          pair: 'BTC-USDC',
          side: 'BUY',
          qty: '1.45',
          price: '64250.00'
        }
      }),
      narrative_state: JSON.stringify({ NAR_01: 91.0, NAR_06: 82.0 }),
      published_at: new Date(Date.now() - 600 * 60000).toISOString() // 10h ago
    },
    {
      id: 'story-8',
      type: 'pulse',
      title: 'Market Pulse: Retail Interest Rises As App Store Downloads Spike',
      summary: 'Crypto wallet downloads enter top 10 rankings globally, signaling incoming retail momentum.',
      body: 'Sentiment Review:\nCrypto wallet downloads have entered the top 10 charts in major app stores for the first time in 18 months. Social media mention indexes have also trended upward, indicating that retail interest is starting to recover.\n\nNarrative check: Retail FOMO temperature rises to 68 degrees. High caution advised on speculative meme indexes.',
      chart_data: null,
      narrative_state: JSON.stringify({ NAR_02: 68.0, NAR_04: 42.0 }),
      published_at: new Date(Date.now() - 720 * 60000).toISOString() // 12h ago
    },
    {
      id: 'story-9',
      type: 'deep_dive',
      title: 'Deep Dive: Stablecoin Issuance Velocity Predicts Q3 Breakout',
      summary: 'USDC and USDT combined supply expands by $3.4B in 14 days, signaling ready-to-deploy dry powder.',
      body: 'Liquidity Analysis:\nHistorically, massive accelerations in stablecoin supply are followed by major market breakouts. The minting velocity of USDC has hit a 6-month high, driven by institutional custody accounts loading liquidity reserves.\n\n| Stablecoin | 14D Supply Change | Active Wallets |\n|---|---|---|\n| USDT | +$2.1B | +5.4% |\n| USDC | +$1.3B | +12.8% |\n| DAI | +$0.05B | -1.2% |\n\nThis capital buffering indicates robust purchasing intent, supporting our mid-term bullish outlook.',
      chart_data: null,
      narrative_state: JSON.stringify({ NAR_01: 72.0, NAR_05: 48.0 }),
      published_at: new Date(Date.now() - 960 * 60000).toISOString() // 16h ago
    },
    {
      id: 'story-10',
      type: 'breaking',
      title: 'Alert: Heavy Institutional Sell Pressure Triggered by Options Expiry',
      summary: 'Breaking: Option contracts worth $4.5B expire, inducing brief market volatility and leverage washouts.',
      body: 'Derivatives Volatility Alert:\nOpen interest washouts have liquidated over $250M in leveraged derivatives contracts. The BTC-USDC pair experienced a brief 4.8% wick down to options max pain level.\n\n[Sector Heatmap]\n\nAutomated risk checks performed. Triggered stop-loss on leverage indices and temporarily paused new momentum trades to monitor support levels.',
      chart_data: JSON.stringify({
        sectors: [
          { name: 'Store of Value', change: -4.5 },
          { name: 'DeFi Tokens', change: -6.2 },
          { name: 'Derivative Indexes', change: -14.8 }
        ],
        execution: {
          pair: 'BTC-USDC',
          side: 'SELL',
          qty: '0.85',
          price: '61100.00'
        }
      }),
      narrative_state: JSON.stringify({ NAR_06: 76.0, NAR_03: 45.0 }),
      published_at: new Date(Date.now() - 1200 * 60000).toISOString() // 20h ago
    },
    {
      id: 'story-11',
      type: 'pulse',
      title: 'Market Pulse: Sovereign Wealth Funds Disclose Bitcoin Holding Allocations',
      summary: 'Two national treasury funds disclose holding positions in sovereign Bitcoin funds in SEC filings.',
      body: 'Regulatory Filing Disclosures:\nSovereign treasury allocations have entered a new era. Institutional filings disclose Bitcoin allocations of 0.8% and 1.2% of total assets, representing billions of dollars in incoming long-term capital backing.',
      chart_data: null,
      narrative_state: JSON.stringify({ NAR_01: 89.0 }),
      published_at: new Date(Date.now() - 1440 * 60000).toISOString() // 24h ago
    },
    {
      id: 'story-12',
      type: 'deep_dive',
      title: 'Deep Dive: Zero-Knowledge Proof Rollups Secure L2 Market Share',
      summary: 'Data validates security cost reduction of 92% for zk-rollups following recent Ethereum updates.',
      body: 'ZK Cryptography Review:\nZero-knowledge verification costs on mainnet have decreased by 92%. This allows L2 platforms to support massive transactions without exposing sensitive user states.\n\n| Platform | Verification Cost | Daily Transactions |\n|---|---|---|\n| Starknet | $0.002 | 1.8M |\n| zkSync | $0.003 | 1.4M |\n| Linea | $0.004 | 1.1M |\n\nThis cost efficiency supports long-term decentralized scaling.',
      chart_data: null,
      narrative_state: JSON.stringify({ NAR_07: 82.0 }),
      published_at: new Date(Date.now() - 1800 * 60000).toISOString() // 30h ago
    }
  ];

  try {
    for (const story of stories) {
      await client.execute({
        sql: `INSERT INTO stories (id, type, title, body, summary, chart_data, narrative_state, published_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          story.id,
          story.type,
          story.title,
          story.body,
          story.summary,
          story.chart_data,
          story.narrative_state,
          story.published_at
        ]
      });
      console.log(`✅ Seeded: ${story.title}`);
    }
    console.log('🎉 Database successfully loaded with 12 rich stories!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    client.close();
  }
}

seed();
