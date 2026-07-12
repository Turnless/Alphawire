import { query } from '../lib/db.js';
import { NARRATIVES, getDominantNarrative, calculateNarrativeTemperature } from './narrative.js';

/**
 * Helper to fetch the temperature of a narrative at a historical offset (closest to now - hoursAgo).
 * If there is not enough history (cold-start), falls back to the current temperature.
 */
async function getHistoricalTemperature(narrativeId, hoursAgo, currentTemp) {
  try {
    const rows = await query(
      `SELECT temperature FROM narrative_history 
       WHERE narrative_id = ? AND recorded_at <= datetime('now', ?) 
       ORDER BY recorded_at DESC LIMIT 1`,
      [narrativeId, `-${hoursAgo} hours`]
    );
    if (rows && rows.length > 0) {
      return rows[0].temperature;
    }
  } catch (err) {
    console.error(`Error fetching historical temp for ${narrativeId}:`, err);
  }
  // Safe baseline fallback for cold-start: use the current temperature to avoid false triggers
  return currentTemp;
}

/**
 * Detects whether a narrative regime shift is currently occurring.
 * @param {Object} narrativeTemperatures - Current temperatures of all narratives
 * @param {Object} history - Database access to historical temperatures (unused/fallback)
 * @returns {Promise<Object|null>} Shift data if detected, otherwise null
 */
export async function detectShift(narrativeTemperatures, history) {
  try {
    // Check if the database has at least 48 hours of narrative history
    const oldestRecord = await query("SELECT MIN(recorded_at) as earliest FROM narrative_history");
    const earliestStr = oldestRecord[0]?.earliest;
    let isColdStart = true;
    if (earliestStr) {
      const diffMs = Date.now() - new Date(earliestStr).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours >= 48) {
        isColdStart = false;
      }
    }

    // Identify the current dominant narrative (7-day lookback)
    const dominant = await getDominantNarrative(null, 168);
    const dominantTempNow = narrativeTemperatures[dominant.id] || 0;

    // Fetch dominant temperature 48 hours ago
    const dominantTemp48hAgo = isColdStart 
      ? dominantTempNow 
      : await getHistoricalTemperature(dominant.id, 48, dominantTempNow);

    const cooling = dominantTemp48hAgo - dominantTempNow;

    // Dominant narrative must be cooling by at least 15 degrees
    if (cooling < 15) {
      return null;
    }

    // Find the fastest-heating non-dominant narrative
    let emergingId = null;
    let maxHeating = 0;

    for (const narId of Object.keys(narrativeTemperatures)) {
      if (narId === dominant.id) continue;

      const tempNow = narrativeTemperatures[narId] || 0;
      const temp48hAgo = isColdStart 
        ? tempNow 
        : await getHistoricalTemperature(narId, 48, tempNow);

      const heating = tempNow - temp48hAgo;

      // Emerging narrative must heat by at least 20 degrees and reach at least 40 degrees
      if (heating >= 20 && tempNow >= 40 && heating > maxHeating) {
        maxHeating = heating;
        emergingId = narId;
      }
    }

    if (!emergingId) {
      return null;
    }

    const fromNarrative = { id: dominant.id, name: dominant.name };
    const toNarrative = { id: emergingId, name: NARRATIVES[emergingId].name };

    // Verify independent signal agreements
    const signalsAgreeing = await countAgreeingSignals(fromNarrative, toNarrative);
    if (signalsAgreeing < 2) {
      return null;
    }

    // Calculate combined confidence
    const confidence = calculateConfidence(cooling, maxHeating, signalsAgreeing);
    if (confidence < 80) {
      return null;
    }

    return {
      from_narrative: dominant.id,
      to_narrative: emergingId,
      confidence: confidence,
      signals: JSON.stringify([
        `Dominant narrative ${dominant.name} cooled by ${cooling.toFixed(2)}°`,
        `Emerging narrative ${NARRATIVES[emergingId].name} heated by ${maxHeating.toFixed(2)}°`,
        `Multi-signal agreement: ${signalsAgreeing} streams aligned`
      ]),
      detected_at: new Date().toISOString()
    };
  } catch (err) {
    console.error('Error in detectShift:', err);
    return null;
  }
}

/**
 * Counts how many independent data streams (News, ETF, Sector) agree on the shift.
 * @param {Object} fromNarrative - The source/cooling narrative
 * @param {Object} toNarrative - The target/heating narrative
 * @returns {Promise<number>} Number of agreeing signals (0 to 3)
 */
export async function countAgreeingSignals(fromNarrative, toNarrative) {
  try {
    const fromId = typeof fromNarrative === 'string' ? fromNarrative : fromNarrative.id;
    const toId = typeof toNarrative === 'string' ? toNarrative : toNarrative.id;

    const fromScores = await calculateNarrativeTemperature(fromId);
    const toScores = await calculateNarrativeTemperature(toId);

    // 1. News signal agrees if target news score is higher than source and meets baseline strength
    const newsAgrees = toScores.newsScore > fromScores.newsScore && toScores.newsScore >= 40;

    // 2. Flow signal agrees if target flow score matches expected patterns (strong alignment)
    const flowAgrees = toScores.flowScore >= 50;

    // 3. Sector signal agrees if target sector score indicates relative rotation leadership
    const sectorAgrees = toScores.sectorScore >= 50;

    let agreeingCount = 0;
    if (newsAgrees) agreeingCount++;
    if (flowAgrees) agreeingCount++;
    if (sectorAgrees) agreeingCount++;

    return agreeingCount;
  } catch (err) {
    console.error('Error in countAgreeingSignals:', err);
    return 0;
  }
}

/**
 * Calculates a combined confidence level for the detected shift.
 * @param {number} cooling - Temperature drop of the dominant narrative
 * @param {number} heating - Temperature rise of the emerging narrative
 * @param {number} signalsAgreeing - Count of agreeing signal sources
 * @returns {number} Confidence percentage (0-100)
 */
export function calculateConfidence(cooling, heating, signalsAgreeing) {
  if (signalsAgreeing < 2) {
    return 0.0;
  }

  // Base confidence starts at 80% when thresholds are met
  let baseConfidence = 80;

  // Add bonus for all 3 signals agreeing
  if (signalsAgreeing === 3) {
    baseConfidence += 5;
  }

  // Excess cooling (above 15) and heating (above 20) adds to confidence
  const coolingExcess = Math.max(0, cooling - 15);
  const heatingExcess = Math.max(0, heating - 20);
  const bonus = Math.min(15, (coolingExcess + heatingExcess) * 0.5);

  return Math.min(100, baseConfidence + bonus);
}

