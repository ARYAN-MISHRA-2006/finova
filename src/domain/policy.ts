import { OracleReading, OracleConfig, aggregateReadings } from './oracle';

export interface TriggerRule {
  index: string;
  aggregation: 'median' | 'average';
  operator: '<' | '>' | '<=' | '>=';
  threshold: number;
  periodDays: number;
}

export interface ProductConfig {
  id: string;
  version: number;
  name: string;
  crop: string;
  premium: number;
  payout: number;
  coverageDays: number;
  trigger: TriggerRule;
  oracleConfig: OracleConfig;
}

export interface Policy {
  policyId: string;
  productId: string;
  productVersion: number;
  farmerId: string;
  crop: string;
  premium: number;
  coverageStart: string;
  coverageEnd: string;
  triggerRule: TriggerRule;
  payoutAmount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED';
}

export function bindPolicy(product: ProductConfig, farmerId: string): Policy {
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + product.coverageDays * 24 * 60 * 60 * 1000);
  
  return {
    policyId: `POL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    productId: product.id,
    productVersion: product.version,
    farmerId: farmerId,
    crop: product.crop,
    premium: product.premium,
    coverageStart: startDate.toISOString(),
    coverageEnd: endDate.toISOString(),
    triggerRule: { ...product.trigger },
    payoutAmount: product.payout,
    status: 'ACTIVE'
  };
}

export interface EvaluationRecord {
  evaluationId: string;
  policyId: string;
  productId: string;
  productVersion: number;
  evaluatedAt: number;
  oracleReadings: OracleReading[];
  validReadings: OracleReading[];
  aggregationMethod: string;
  aggregatedValue: number | null;
  rule: TriggerRule;
  decision: 'TRIGGER' | 'NO_TRIGGER' | 'HOLD';
  reason?: string;
  payoutAmount: number;
}

export function evaluatePolicy(
  policy: Policy, 
  readings: OracleReading[], 
  oracleConfig: OracleConfig
): EvaluationRecord {
  const evaluatedAt = Date.now();
  
  const record: EvaluationRecord = {
    evaluationId: `EVAL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    policyId: policy.policyId,
    productId: policy.productId,
    productVersion: policy.productVersion,
    evaluatedAt,
    oracleReadings: readings,
    validReadings: [],
    aggregationMethod: policy.triggerRule.aggregation,
    aggregatedValue: null,
    rule: policy.triggerRule,
    decision: 'HOLD',
    payoutAmount: policy.payoutAmount
  };

  const validReadings = readings.filter(r => r.status === 'RESPONDING');
  record.validReadings = validReadings;

  if (validReadings.length < oracleConfig.minimumValidSources) {
    record.decision = 'HOLD';
    record.reason = 'INSUFFICIENT_VALID_SOURCES';
    return record;
  }

  // Check disagreement
  if (oracleConfig.maxDisagreementTolerance !== undefined && validReadings.length > 0) {
    const vals = validReadings.map(r => r.value as number);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if ((max - min) > oracleConfig.maxDisagreementTolerance) {
      record.decision = 'HOLD';
      record.reason = 'SOURCE_DISAGREEMENT';
      return record;
    }
  }

  const aggregatedValue = aggregateReadings(validReadings, policy.triggerRule.aggregation);
  record.aggregatedValue = aggregatedValue;

  let triggered = false;
  const { operator, threshold } = policy.triggerRule;

  switch (operator) {
    case '<': triggered = aggregatedValue < threshold; break;
    case '<=': triggered = aggregatedValue <= threshold; break;
    case '>': triggered = aggregatedValue > threshold; break;
    case '>=': triggered = aggregatedValue >= threshold; break;
  }

  record.decision = triggered ? 'TRIGGER' : 'NO_TRIGGER';
  return record;
}
