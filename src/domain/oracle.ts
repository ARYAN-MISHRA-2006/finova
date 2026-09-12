export interface OracleReading {
  sourceId: string;
  value: number | null;
  unit: string;
  timestamp: number;
  receivedAt: number;
  status: 'RESPONDING' | 'NONRESPONSIVE' | 'STALE' | 'INVALID';
}

export interface OracleConfig {
  requiredSources: number;
  minimumValidSources: number;
  maxSourceAgeMs: number;
  maxDisagreementTolerance?: number; // e.g. if diff between min and max > tolerance, HOLD
}

export function validateReading(
  reading: Partial<OracleReading>, 
  currentTime: number,
  maxAgeMs: number
): OracleReading {
  const result: OracleReading = {
    sourceId: reading.sourceId || 'UNKNOWN',
    value: reading.value !== undefined ? reading.value : null,
    unit: reading.unit || 'mm',
    timestamp: reading.timestamp || 0,
    receivedAt: currentTime,
    status: 'RESPONDING'
  };

  if (result.value === null || isNaN(result.value) || result.value < 0) {
    result.status = 'INVALID';
    return result;
  }

  if (!reading.timestamp) {
    result.status = 'NONRESPONSIVE';
    return result;
  }

  if (currentTime - reading.timestamp > maxAgeMs) {
    result.status = 'STALE';
    return result;
  }

  return result;
}

export function aggregateReadings(
  validReadings: OracleReading[], 
  method: 'median' | 'average'
): number {
  if (validReadings.length === 0) return 0;
  
  const values = validReadings.map(r => r.value as number).sort((a, b) => a - b);
  
  if (method === 'median') {
    const mid = Math.floor(values.length / 2);
    return values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  } else {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
