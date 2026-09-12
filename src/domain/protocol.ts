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

export async function calculateBalanceHash(walletId: string, farmerId: string, newBalancePaise: number, sequenceNumber: number, transactionId: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${walletId}:${farmerId}:${newBalancePaise}:${sequenceNumber}:${transactionId}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createOfflineTransactionPayload(data: any): Promise<string> {
   const payload = JSON.stringify(data);
   const key = await getCryptoKey();
   const enc = new TextEncoder();
   const signatureBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
   const sigHex = Array.from(new Uint8Array(signatureBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
   return `INSUREX1.${btoa(payload)}.${sigHex}`;
}

export async function verifyOfflineTransactionPayload(payloadString: string): Promise<any> {
   if (!payloadString.startsWith('INSUREX1.')) throw new Error('Invalid format');
   const parts = payloadString.split('.');
   if (parts.length !== 3) throw new Error('Invalid payload segments');
   const [_, b64, sigHex] = parts;
   const payload = atob(b64);
   const enc = new TextEncoder();
   const key = await getCryptoKey();
   const expectedSigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
   const expectedSigHex = Array.from(new Uint8Array(expectedSigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
   if (sigHex !== expectedSigHex) throw new Error('Invalid Signature');
   return JSON.parse(payload);
}
