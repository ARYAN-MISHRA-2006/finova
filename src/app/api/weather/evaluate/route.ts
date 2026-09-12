import { NextResponse } from 'next/server';
import { evaluateWeatherTrust, WeatherObservation } from '@/domain/weather-trust';
import { evaluatePolicy, PolicyData } from '@/domain/policy-engine';
import { encodeCriticalRecord } from '@/domain/protocol';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { policy, readings, userId } = await req.json();

  // 1. Weather Trust
  const trustResult = evaluateWeatherTrust(readings, policy);

  if (trustResult.status !== 'VALID' || trustResult.trustedValue === null) {
    db.prepare('INSERT INTO audit_logs (id, timestamp, event_type, details) VALUES (?, ?, ?, ?)').run(
      crypto.randomUUID(), Date.now(), 'WEATHER_HOLD', JSON.stringify(trustResult)
    );
    return NextResponse.json({ status: 'HOLD', trustResult });
  }

  // 2. Policy Engine
  const decision = evaluatePolicy(trustResult.trustedValue, policy);

  // 3. Payout & Critical Record
  let criticalRecordBase64 = null;
  let claimId = crypto.randomUUID();

  if (decision.triggered) {
    const record = await encodeCriticalRecord({
      policyId: policy.productId,
      sequence: 1, // simplified sequence
      triggered: true,
      payoutAmount: decision.payoutAmount,
      oracleValue: trustResult.trustedValue,
    });
    // For sync we just convert to base64
    criticalRecordBase64 = Buffer.from(record).toString('base64');
  }

  const auditDetails = {
    trustResult,
    decision,
    policy: policy.productId,
    payout: decision.payoutAmount,
    criticalRecord: criticalRecordBase64
  };

  db.prepare('INSERT INTO audit_logs (id, timestamp, event_type, details) VALUES (?, ?, ?, ?)').run(
    claimId, Date.now(), 'POLICY_EVALUATED', JSON.stringify(auditDetails)
  );

  return NextResponse.json({
    status: decision.reason,
    trustResult,
    decision,
    criticalRecordBase64
  });
}
