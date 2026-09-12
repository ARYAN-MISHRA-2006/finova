import { PolicyData } from './policy-engine';

export interface WeatherObservation {
  source: string;
  value: number;
  timestamp: number; // ms since epoch
}

export interface WeatherTrustResult {
  trustedValue: number | null;
  validSources: WeatherObservation[];
  staleSources: WeatherObservation[];
  outliers: WeatherObservation[];
  quorumReached: boolean;
  status: 'VALID' | 'HOLD' | 'INSUFFICIENT_DATA';
  aggregationMethod: string;
}

export function evaluateWeatherTrust(
  observations: WeatherObservation[],
  policy: PolicyData,
  currentTimeMs: number = Date.now(),
  maxAgeMs: number = 60 * 60 * 1000 // 1 hour
): WeatherTrustResult {
  const staleSources: WeatherObservation[] = [];
  const freshSources: WeatherObservation[] = [];

  for (const obs of observations) {
    if (currentTimeMs - obs.timestamp > maxAgeMs) {
      staleSources.push(obs);
    } else {
      freshSources.push(obs);
    }
  }

  if (freshSources.length < 2) {
    return {
      trustedValue: null,
      validSources: freshSources,
      staleSources,
      outliers: [],
      quorumReached: false,
      status: 'INSUFFICIENT_DATA',
      aggregationMethod: policy.aggregation,
    };
  }

  // 1. Initial median for outlier detection
  const values = freshSources.map(s => s.value).sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2.0;

  // 2. Outlier rejection (e.g., > 20mm diff from median)
  const OUTLIER_THRESHOLD = 20;
  const validSources: WeatherObservation[] = [];
  const outliers: WeatherObservation[] = [];

  for (const obs of freshSources) {
    if (Math.abs(obs.value - median) > OUTLIER_THRESHOLD) {
      outliers.push(obs);
    } else {
      validSources.push(obs);
    }
  }

  // 3. Quorum check
  if (validSources.length < 2) {
    return {
      trustedValue: null,
      validSources,
      staleSources,
      outliers,
      quorumReached: false,
      status: 'INSUFFICIENT_DATA',
      aggregationMethod: policy.aggregation,
    };
  }

  // 4. Disagreement check on remaining valid sources (e.g. max diff > 15)
  const validValues = validSources.map(s => s.value);
  const maxVal = Math.max(...validValues);
  const minVal = Math.min(...validValues);
  
  if (maxVal - minVal > 15 && policy.disagreement === 'HOLD') {
    return {
      trustedValue: null,
      validSources,
      staleSources,
      outliers,
      quorumReached: true,
      status: 'HOLD',
      aggregationMethod: policy.aggregation,
    };
  }

  // 5. Final aggregation
  validValues.sort((a, b) => a - b);
  const fMid = Math.floor(validValues.length / 2);
  const finalMedian = validValues.length % 2 !== 0 ? validValues[fMid] : (validValues[fMid - 1] + validValues[fMid]) / 2.0;

  return {
    trustedValue: finalMedian,
    validSources,
    staleSources,
    outliers,
    quorumReached: true,
    status: 'VALID',
    aggregationMethod: policy.aggregation,
  };
}
