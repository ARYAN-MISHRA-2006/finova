export interface CriticalRecordData {
  policyId: string;
  sequence: number;
  triggered: boolean;
  payoutAmount: number;
  oracleValue: number;
}

const SECRET_KEY_STRING = "dummy-secret-key-for-finova-demo";

async function getCryptoKey() {
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(SECRET_KEY_STRING.padEnd(32, '\0').substring(0, 32));
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function encodeCriticalRecord(data: CriticalRecordData): Promise<Uint8Array> {
  const buffer = new Uint8Array(64);
  const view = new DataView(buffer.buffer);
  
  // [0-15] Policy ID (ASCII, padded with 0)
  const enc = new TextEncoder();
  const policyBytes = enc.encode(data.policyId.substring(0, 16).padEnd(16, '\0'));
  buffer.set(policyBytes, 0);
  
  // [16-19] Sequence (UInt32 LE)
  view.setUint32(16, data.sequence, true);
  
  // [20] Trigger result (UInt8)
  view.setUint8(20, data.triggered ? 1 : 0);
  
  // [21-24] Payout Amount (UInt32 LE)
  view.setUint32(21, data.payoutAmount, true);
  
  // [25-28] Oracle Value (Float32 LE)
  view.setFloat32(25, data.oracleValue, true);
  
  // [29-31] Padding (already 0)

  // [32-63] HMAC Signature
  const payload = buffer.slice(0, 32);
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign('HMAC', key, payload);
  
  buffer.set(new Uint8Array(signature), 32);

  return buffer;
}

export async function decodeCriticalRecord(buffer: Uint8Array): Promise<CriticalRecordData> {
  if (buffer.length !== 64) {
    throw new Error('Critical record must be EXACTLY 64 bytes');
  }
  
  const payload = buffer.slice(0, 32);
  const providedSignature = buffer.slice(32, 64);
  
  // Verify Signature
  const key = await getCryptoKey();
  const isValid = await crypto.subtle.verify('HMAC', key, providedSignature, payload);
  
  if (!isValid) {
    throw new Error('Invalid signature on critical record');
  }

  const view = new DataView(buffer.buffer);

  // Parse fields
  const dec = new TextDecoder('ascii');
  const rawPolicyId = dec.decode(buffer.slice(0, 16));
  const policyId = rawPolicyId.replace(/\0/g, '');
  const sequence = view.getUint32(16, true);
  const triggered = view.getUint8(20) === 1;
  const payoutAmount = view.getUint32(21, true);
  const oracleValue = view.getFloat32(25, true);

  return {
    policyId,
    sequence,
    triggered,
    payoutAmount,
    oracleValue
  };
}
