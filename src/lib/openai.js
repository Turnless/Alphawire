import OpenAI from 'openai';

/**
 * OpenAI API Client for Cinder.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * Generates a concise Market Pulse report based on ETF flows and sector movers.
 * @param {Object} data - Current ETF flows, sector data, and top news headlines
 * @returns {Promise<string>} Generated Market Pulse report (Markdown format)
 */
export async function generateMarketPulse(data) {
  const btcFlow = data.btcFlow !== undefined ? data.btcFlow : (data.btc_flow || 'N/A');
  const ethFlow = data.ethFlow !== undefined ? data.ethFlow : (data.eth_flow || 'N/A');
  const topSector = data.topSector || data.top_sector || 'N/A';
  const topSectorReturn = data.topSectorReturn || data.top_sector_return || 'N/A';
  const bottomSector = data.bottomSector || data.bottom_sector || 'N/A';
  const bottomSectorReturn = data.bottomSectorReturn || data.bottom_sector_return || 'N/A';
  const narrativeTemp = data.narrativeTemp !== undefined ? data.narrativeTemp : (data.narrative_temp || data.temperature || 'N/A');
  
  let headlinesStr = 'N/A';
  if (Array.isArray(data.headlines)) {
    headlinesStr = data.headlines.map(h => typeof h === 'string' ? h : (h.title || '')).slice(0, 5).join('\n- ');
    headlinesStr = '\n- ' + headlinesStr;
  } else if (typeof data.headlines === 'string') {
    headlinesStr = data.headlines;
  }

  const prompt = `You are Cinder, an AI financial wire service. Write a Market Pulse report.

DATA PROVIDED:
- BTC ETF Net Flow: ${btcFlow}
- ETH ETF Net Flow: ${ethFlow}
- Top performing sector: ${topSector} (${topSectorReturn})
- Bottom performing sector: ${bottomSector} (${bottomSectorReturn})
- Top AI News Headlines: ${headlinesStr}
- Current Narrative Temperature: ${narrativeTemp}

RULES:
- Write in Reuters/Bloomberg wire style: factual, concise, institutional
- Lead with the most significant data point
- Include ONE forward-looking "AI Analysis" paragraph
- End with narrative temperature reading
- Keep under 300 words
- Do NOT use emojis in the body text`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an institutional financial journalist.' },
        { role: 'user', content: prompt }
      ]
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating Market Pulse:', error);
    return `MARKET PULSE ERROR: Failed to generate report. Raw flows: BTC ETF: ${btcFlow}, ETH ETF: ${ethFlow}. Sector Movers: Top: ${topSector} (${topSectorReturn}), Bottom: ${bottomSector} (${bottomSectorReturn}).`;
  }
}

/**
 * Generates an in-depth Daily Deep Dive report.
 * @param {Object} data - Historical ETF trends, sector performance, and narrative states
 * @returns {Promise<string>} Generated Daily Deep Dive report (Markdown format)
 */
export async function generateDailyDeepDive(data) {
  const etfFlowTrend = data.etfFlowTrend || data.etf_flow_trend || 'N/A';
  const sectorComparison = data.sectorComparison || data.sector_comparison || 'N/A';
  const newsSentiment = data.newsSentiment || data.news_sentiment || 'N/A';
  const narrativeState = data.narrativeState || data.narrative_state || 'N/A';

  const prompt = `You are Cinder, an AI financial wire service. Write an in-depth Daily Deep Dive market analysis.

DATA PROVIDED:
- 7-Day ETF Flow Trend: ${typeof etfFlowTrend === 'object' ? JSON.stringify(etfFlowTrend) : etfFlowTrend}
- Sector Performance & Comparison: ${typeof sectorComparison === 'object' ? JSON.stringify(sectorComparison) : sectorComparison}
- AI News Sentiment Analysis: ${typeof newsSentiment === 'object' ? JSON.stringify(newsSentiment) : newsSentiment}
- Current Narrative State: ${typeof narrativeState === 'object' ? JSON.stringify(narrativeState) : narrativeState}

RULES:
- Write in a professional, Wall Street research note style: analytical, objective, detailed.
- Structure the report into:
  1. Executive Summary
  2. Institutional Capital Flows (analyzing ETF trends)
  3. Sector Rotation & Relative Strength (analyzing sector performance)
  4. Narrative Intelligence (analyzing current dominant narratives, sentiment, and temperatures)
  5. Outlook & Forward-Looking Risk Analysis
- Output should be approximately 800 words in Markdown format.
- Integrate references to the flow trend chart and sector heatmap (placeholder markers like [ETF Flow Trend Chart] or [Sector Heatmap] are fine for client rendering).
- Do NOT use emojis.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an institutional financial analyst and research editor.' },
        { role: 'user', content: prompt }
      ]
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating Daily Deep Dive:', error);
    return `DAILY DEEP DIVE ERROR: Failed to generate report. Raw trends: ETF flow trend: ${JSON.stringify(etfFlowTrend)}, Sector: ${JSON.stringify(sectorComparison)}.`;
  }
}

/**
 * Generates a breaking news alert when a narrative regime shift occurs.
 * @param {Object} params - Shift detection details and trade execution records
 * @returns {Promise<string>} Generated Breaking Alert (Markdown format)
 */
export async function createBreakingStory({ shiftData, tradeData, publishedAt }) {
  const fromNarrative = shiftData?.previousNarrative || shiftData?.fromNarrative || shiftData?.from_narrative || 'N/A';
  const toNarrative = shiftData?.dominantNarrative || shiftData?.toNarrative || shiftData?.to_narrative || 'N/A';
  const confidence = shiftData?.confidence || 'N/A';
  const signals = shiftData?.signals || shiftData?.evidence || [];
  
  const side = tradeData?.side || 'N/A';
  const pair = tradeData?.pair || 'N/A';
  const quantity = tradeData?.quantity || 'N/A';
  const fillPrice = tradeData?.fillPrice || tradeData?.price || 'N/A';
  const status = tradeData?.status || 'N/A';
  const orderId = tradeData?.orderId || 'N/A';
  
  let signalsStr = 'N/A';
  if (Array.isArray(signals)) {
    signalsStr = signals.map(s => `- ${s}`).join('\n');
  } else if (typeof signals === 'object') {
    signalsStr = JSON.stringify(signals);
  } else {
    signalsStr = signals;
  }

  const prompt = `You are Cinder, an AI financial wire service. Write a Breaking News Alert about a market narrative regime change.

SHIFT DETAILS:
- Previous Narrative: ${fromNarrative}
- New Narrative: ${toNarrative}
- Shift Confidence: ${confidence}%
- Supporting Signals / Evidence:
${signalsStr}

TRADE DETAILS:
- Side: ${side}
- Trading Pair: ${pair}
- Quantity: ${quantity}
- Fill Price: ${fillPrice}
- Execution Status: ${status}
- Order ID: ${orderId}
- Executed At: ${publishedAt}

RULES:
- Lead with an urgent breaking headline in wire service style.
- Clearly present the transition from the old narrative regime to the new one.
- Include a Markdown table detailing the supporting evidence (signals) that triggered this shift.
- Outline the trade execution details and explain the quantitative reasoning behind the trade.
- Write in a factual, high-urgency, yet highly professional and institutional tone.
- Do NOT use emojis.
- Output should be approximately 500 words in Markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an institutional financial wire editor.' },
        { role: 'user', content: prompt }
      ]
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating Breaking Alert:', error);
    return `BREAKING NEWS ALERT ERROR: Failed to generate alert. Shift detected from ${fromNarrative} to ${toNarrative} with ${confidence}% confidence. Trade executed: ${side} ${quantity} ${pair}.`;
  }
}

/**
 * Classifies news articles/headlines into dominant crypto narrative archetypes.
 * @param {Array<Object>} headlines - List of headlines/summaries to classify
 * @returns {Promise<Object>} Narrative keyword frequencies and sentiment scores
 */
export async function classifyNarrativeText(headlines) {
  if (!headlines || headlines.length === 0) {
    return {
      keywordFrequencies: {},
      sentimentScores: {}
    };
  }

  // Format headlines for prompt
  const headlinesFormatted = headlines.map((h, i) => {
    const title = typeof h === 'string' ? h : (h.title || '');
    const summary = typeof h === 'string' ? '' : (h.summary || '');
    return `[ID: ${i}] Title: ${title}\nSummary: ${summary}`;
  }).join('\n\n');

  const systemPrompt = `You are an AI financial analyst specializing in crypto markets.
Analyze the following news headlines and summaries, and for each headline:
1. Extract relevant keywords.
2. Determine sentiment on a scale from -1.0 (extremely negative) to 1.0 (extremely positive).
3. Classify it into one of the 8 crypto narrative archetypes:
   - NAR_01: Institutional Accumulation (adoption, ETFs, etc.)
   - NAR_02: Retail FOMO (moon, ATH, breakouts)
   - NAR_03: Regulatory Storm (SEC, bans, compliance)
   - NAR_04: AI/Tech Rotation (AI, GPU, artificial intelligence)
   - NAR_05: DeFi Renaissance (DeFi, yield, TVL, protocol)
   - NAR_06: Risk-Off Flight (macro crash, recession, risk-off)
   - NAR_07: L2/Infra Cycle (scaling, rollups, Layer 2)
   - NAR_08: Black Swan (hack, systemic collapse, volume anomaly)
   - NONE: If it does not fit any of these archetypes.

You must return a JSON object with:
- "classifications": an array of items, each containing:
  - "id": the ID number from the input
  - "sentiment": floating point number between -1.0 and 1.0
  - "keywords": array of lowercase keywords extracted
  - "archetype": the archetype ID (NAR_01 to NAR_08, or NONE)`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: headlinesFormatted }
      ],
      response_format: { type: 'json_object' }
    });

    const parsedResult = JSON.parse(response.choices[0].message.content);
    
    // Process results to aggregate keyword frequencies and sentiment scores
    const keywordFrequencies = {};
    const sentimentScores = {};
    
    // Initialize archetype sentiment scores lists
    const archetypeSentiments = {};
    for (let i = 1; i <= 8; i++) {
      archetypeSentiments[`NAR_0${i}`] = [];
    }

    if (parsedResult && parsedResult.classifications) {
      for (const cls of parsedResult.classifications) {
        // Count keywords
        if (Array.isArray(cls.keywords)) {
          for (const kw of cls.keywords) {
            const normalizedKw = kw.toLowerCase().trim();
            keywordFrequencies[normalizedKw] = (keywordFrequencies[normalizedKw] || 0) + 1;
          }
        }
        
        // Group sentiment by archetype
        if (cls.archetype && archetypeSentiments[cls.archetype]) {
          archetypeSentiments[cls.archetype].push(cls.sentiment);
        }
      }
    }

    // Calculate average sentiment for each archetype
    for (let i = 1; i <= 8; i++) {
      const id = `NAR_0${i}`;
      const sents = archetypeSentiments[id];
      if (sents.length > 0) {
        sentimentScores[id] = sents.reduce((a, b) => a + b, 0) / sents.length;
      } else {
        sentimentScores[id] = 0; // neutral default
      }
    }

    return {
      keywordFrequencies,
      sentimentScores,
      classifications: parsedResult.classifications || []
    };

  } catch (error) {
    console.error('Error in classifyNarrativeText:', error);
    return {
      keywordFrequencies: {},
      sentimentScores: {},
      classifications: []
    };
  }
}

