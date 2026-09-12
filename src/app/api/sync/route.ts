import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const transactions = await req.json(); // array of transactions
  const results = [];

  for (const tx of transactions) {
    const { id, userId, amount, type, timestamp, sequence, prevHash, newHash } = tx;

    // Idempotency: Check if tx already exists
    const existing = db.prepare('SELECT status FROM server_transactions WHERE id = ?').get(id) as { status: string } | undefined;
    if (existing) {
      results.push({ id, status: 'SYNCED_ALREADY' });
      continue;
    }

    // Sequence & Reconciliation check
    const lastTx = db.prepare('SELECT new_hash, sequence FROM server_transactions WHERE user_id = ? ORDER BY sequence DESC LIMIT 1').get(userId) as any;
    
    if (lastTx) {
      if (sequence <= lastTx.sequence) {
        results.push({ id, status: 'REJECTED_OLD_SEQUENCE' });
        continue;
      }
      if (prevHash !== lastTx.new_hash && sequence === lastTx.sequence + 1) {
        // Technically could be a fork/conflict. In simplified protocol, we reject.
        results.push({ id, status: 'RECONCILIATION_REQUIRED' });
        continue;
      }
    }

    // Accept transaction
    db.prepare(`
      INSERT INTO server_transactions (id, user_id, amount, type, timestamp, sequence, prev_hash, new_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, amount, type, timestamp, sequence, prevHash, newHash, 'SYNCED');

    // Update wallet balance
    db.prepare(`
      INSERT INTO server_wallets (user_id, balance, last_sequence, last_hash) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET 
        balance = balance + excluded.balance,
        last_sequence = excluded.last_sequence,
        last_hash = excluded.last_hash
    `).run(userId, amount, sequence, newHash);

    results.push({ id, status: 'SYNCED' });
  }

  return NextResponse.json({ results });
}
