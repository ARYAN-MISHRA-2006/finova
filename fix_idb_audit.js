const fs = require('fs');
let code = fs.readFileSync('src/lib/idb.ts', 'utf8');

code += `
import { EvaluationRecord } from '../domain/policy';

export async function saveEvaluation(record: EvaluationRecord) {
  const existing = await getLocalState('evaluations_registry') || [];
  existing.push(record);
  await setLocalState('evaluations_registry', existing);
}

export async function getEvaluations(): Promise<EvaluationRecord[]> {
  return await getLocalState('evaluations_registry') || [];
}
`;

fs.writeFileSync('src/lib/idb.ts', code);
