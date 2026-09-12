import { validateReading, OracleReading } from './src/domain/oracle';
import { ProductConfig, bindPolicy, evaluatePolicy } from './src/domain/policy';

const product: ProductConfig = {
  id: "drought-shield",
  version: 1,
  name: "Drought Shield",
  crop: "groundnut",
  premium: 250,
  payout: 10000,
  coverageDays: 30,
  trigger: {
    index: "rainfall",
    aggregation: "median",
    periodDays: 30,
    operator: "<",
    threshold: 100
  },
  oracleConfig: {
    requiredSources: 3,
    minimumValidSources: 2,
    maxSourceAgeMs: 60 * 60 * 1000, // 1 hour
    maxDisagreementTolerance: 50 // allow up to 50mm diff
  }
};

const policy = bindPolicy(product, 'ramu');
const now = Date.now();

function runTest(name: string, inputs: any[]) {
  const readings = inputs.map(i => validateReading({
    sourceId: i.id,
    value: i.v,
    timestamp: now - (i.age || 0)
  }, now, product.oracleConfig.maxSourceAgeMs));
  
  const result = evaluatePolicy(policy, readings, product.oracleConfig);
  console.log(`\n=== ${name} ===`);
  console.log(`Decision: ${result.decision}`);
  if (result.reason) console.log(`Reason: ${result.reason}`);
  console.log(`Aggregated: ${result.aggregatedValue}`);
}

// 1. Normal Trigger Test
runTest('Normal Trigger', [
  { id: 'A', v: 72 },
  { id: 'B', v: 74 },
  { id: 'C', v: 71 }
]);

// 2. No Trigger Test
runTest('No Trigger', [
  { id: 'A', v: 120 },
  { id: 'B', v: 125 },
  { id: 'C', v: 122 }
]);

// 3. Outlier Test
runTest('Outlier', [
  { id: 'A', v: 72 },
  { id: 'B', v: 74 },
  { id: 'C', v: 4 }
]);

// 4. Stale Oracle Test
runTest('Stale', [
  { id: 'A', v: 72 },
  { id: 'B', v: 74 },
  { id: 'C', v: 71, age: 2 * 60 * 60 * 1000 }
]);

// 5. Nonresponsive Test
runTest('Nonresponsive', [
  { id: 'A', v: 72 },
  { id: 'B', v: 74 },
  { id: 'C', v: null }
]);

// 6. Disagreement Test
runTest('Disagreement', [
  { id: 'A', v: 40 },
  { id: 'B', v: 100 },
  { id: 'C', v: 150 }
]);
