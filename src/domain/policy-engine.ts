export interface PolicyTrigger {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '==';
  threshold: number;
  unit: string;
}

export interface PolicyPayout {
  amount: number;
  currency: string;
}

export interface PolicyData {
  productId: string;
  name: string;
  crop: string;
  periodDays: number;
  trigger: PolicyTrigger;
  payout: PolicyPayout;
  aggregation: string;
  disagreement: string;
}

export function evaluatePolicy(trustedValue: number | null, policy: PolicyData): { triggered: boolean, payoutAmount: number, reason: string } {
  if (trustedValue === null) {
    return { triggered: false, payoutAmount: 0, reason: "HOLD" };
  }

  const { operator, threshold } = policy.trigger;
  let triggered = false;

  switch (operator) {
    case '<': triggered = trustedValue < threshold; break;
    case '<=': triggered = trustedValue <= threshold; break;
    case '>': triggered = trustedValue > threshold; break;
    case '>=': triggered = trustedValue >= threshold; break;
    case '==': triggered = trustedValue === threshold; break;
  }

  return {
    triggered,
    payoutAmount: triggered ? policy.payout.amount : 0,
    reason: triggered ? "TRIGGERED" : "NOT_TRIGGERED"
  };
}
