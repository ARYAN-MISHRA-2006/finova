import { getDB } from '../lib/idb';
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




export async function getDeviceKeyPair(userId: string): Promise<CryptoKeyPair> {
  // We can't import getDB top-level easily if there's a circular dependency, but let's assume it's fine.
  const db = await getDB();
  if (!db) {
    // For server side or if no DB, just generate a temporary one, 
    // but this shouldn't be called without DB usually.
    return await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
  }
  
  const keyName = `deviceKeyPair_${userId}`;
  let keyPair = await db.get('keyval', keyName);
  
  if (!keyPair) {
    keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      false, // non-extractable private key
      ["sign", "verify"]
    );
    await db.put('keyval', keyPair, keyName);
  }
  
  return keyPair;
}

export async function createOfflineTransactionPayload(data: any, userId: string): Promise<string> {
   const keyPair = await getDeviceKeyPair(userId);
   const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
   
   data.publicKey = publicKeyJwk;
   const payload = JSON.stringify(data);
   
   const enc = new TextEncoder();
   const signatureBuf = await crypto.subtle.sign(
     { name: "ECDSA", hash: { name: "SHA-256" } },
     keyPair.privateKey,
     enc.encode(payload)
   );
   
   const sigHex = Array.from(new Uint8Array(signatureBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
   
   const fullPayload = {
     version: 1,
     type: "INSUREX_OFFLINE_TX",
     ...data,
     signature: sigHex
   };
   
   return JSON.stringify(fullPayload);
}

export async function verifyOfflineTransactionPayload(payloadString: string): Promise<any> {
   let parsed;
   try {
     parsed = JSON.parse(payloadString);
   } catch(e) {
     throw new Error('Invalid format: not JSON');
   }
   
   if (parsed.version !== 1 || parsed.type !== 'INSUREX_OFFLINE_TX') {
     throw new Error('Invalid transaction type or version');
   }
   
   const { version, type, signature, ...dataObj } = parsed;
   
   if (!signature || !dataObj.publicKey) {
     throw new Error('Missing signature or public key');
   }
   
   const publicKey = await crypto.subtle.importKey(
     'jwk',
     dataObj.publicKey,
     { name: "ECDSA", namedCurve: "P-256" },
     true,
     ['verify']
   );
   
   const enc = new TextEncoder();
   const payloadToVerify = JSON.stringify(dataObj);
   
   const sigBytes = new Uint8Array( (signature.match(/.{1,2}/g) || []).map((byte: string) => parseInt(byte, 16)));
   
   const isValid = await crypto.subtle.verify(
     { name: "ECDSA", hash: { name: "SHA-256" } },
     publicKey,
     sigBytes,
     enc.encode(payloadToVerify)
   );
   
   if (!isValid) throw new Error('Invalid Signature');
   
   // Verify hash
   const expectedHash = await calculateBalanceHash(dataObj.walletId, dataObj.farmerId, dataObj.newBalancePaise, dataObj.sequenceNumber, dataObj.transactionId);
   if (expectedHash !== dataObj.balanceHash) {
     throw new Error('Invalid Balance Hash');
   }
   
   return parsed;
}
