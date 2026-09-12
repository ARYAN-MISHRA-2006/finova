import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Initialize the offline_transactions table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS offline_transactions (
    transactionId TEXT PRIMARY KEY,
    walletId TEXT,
    farmerId TEXT,
    deviceId TEXT,
    amountPaise INTEGER,
    newBalancePaise INTEGER,
    sequenceNumber INTEGER,
    timestamp TEXT,
    balanceHash TEXT,
    signature TEXT,
    status TEXT,
    createdAt INTEGER,
    syncedAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS farmer_wallets (
    farmerId TEXT PRIMARY KEY,
    balancePaise INTEGER DEFAULT 0,
    sequenceNumber INTEGER DEFAULT 0
  );
`);

const SECRET_KEY_STRING = "dummy-secret-key-for-finova-demo";

function verifySignature(payload: any, signatureHex: string) {
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(payload));
  const key = crypto.createSecretKey(SECRET_KEY_STRING.padEnd(32, '\0').substring(0, 32), 'utf-8');
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  const expected = hmac.digest('hex');
  return expected === signatureHex;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const transactions = Array.isArray(body) ? body : [body];
    const results = [];

    for (const tx of transactions) {
      const { transactionId, walletId, farmerId, deviceId, amountPaise, newBalancePaise, sequenceNumber, timestamp, balanceHash, signature } = tx;

      if (!transactionId || !farmerId || !amountPaise || !sequenceNumber || !signature) {
        results.push({ status: "REJECTED", reason: "Missing required fields", transactionId });
        continue;
      }

      // Verify signature
      const payloadObj = {
        transactionId, walletId, farmerId, deviceId, amountPaise, newBalancePaise, sequenceNumber, timestamp, balanceHash
      };
      
      if (!verifySignature(payloadObj, signature)) {
        results.push({ status: "REJECTED", reason: "Invalid Signature", transactionId });
        continue;
      }

      // Initialize wallet if not exists
      db.prepare(`INSERT OR IGNORE INTO farmer_wallets (farmerId, balancePaise, sequenceNumber) VALUES (?, ?, ?)`).run(farmerId, 1000000, 42);

      // Idempotency: Check if tx already exists
      const existing = db.prepare('SELECT status FROM offline_transactions WHERE transactionId = ?').get(transactionId) as any;
      if (existing) {
        const wallet = db.prepare('SELECT balancePaise FROM farmer_wallets WHERE farmerId = ?').get(farmerId) as any;
        results.push({ status: 'ALREADY_PROCESSED', transactionId, sequenceNumber, serverBalance: wallet.balancePaise });
        continue;
      }

      // Sequence & Reconciliation check
      const wallet = db.prepare('SELECT balancePaise, sequenceNumber FROM farmer_wallets WHERE farmerId = ?').get(farmerId) as any;
      
      if (sequenceNumber <= wallet.sequenceNumber) {
        results.push({ status: 'REJECTED', reason: 'Replay / Already Processed', transactionId });
        continue;
      }

      if (wallet.balancePaise < amountPaise) {
         results.push({ status: 'REJECTED', reason: 'Insufficient funds', transactionId });
         continue;
      }

      // Accept transaction atomically
      const runTx = db.transaction(() => {
        db.prepare(`
          INSERT INTO offline_transactions (transactionId, walletId, farmerId, deviceId, amountPaise, newBalancePaise, sequenceNumber, timestamp, balanceHash, signature, status, createdAt, syncedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(transactionId, walletId, farmerId, deviceId, amountPaise, newBalancePaise, sequenceNumber, timestamp, balanceHash, signature, 'SYNCED', Date.now(), Date.now());

        db.prepare(`
          UPDATE farmer_wallets SET balancePaise = balancePaise - ?, sequenceNumber = ? WHERE farmerId = ?
        `).run(amountPaise, sequenceNumber, farmerId);
      });

      try {
        runTx();
        const updatedWallet = db.prepare('SELECT balancePaise FROM farmer_wallets WHERE farmerId = ?').get(farmerId) as any;
        results.push({ status: 'ACCEPTED', transactionId, sequenceNumber, serverBalance: updatedWallet.balancePaise });
      } catch (err: any) {
        results.push({ status: 'REJECTED', reason: err.message, transactionId });
      }
    }

    return NextResponse.json(Array.isArray(body) ? results : results[0]);
  } catch (err: any) {
    return NextResponse.json({ status: "REJECTED", reason: err.message }, { status: 400 });
  }
}
