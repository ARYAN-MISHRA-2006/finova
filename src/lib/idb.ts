import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface WalletTransaction {
  id: string; // Transaction ID
  userId: string;
  amount: number; // positive for payout, negative for spend
  type: 'PAYOUT' | 'SPEND';
  timestamp: number;
  sequence: number;
  prevHash: string;
  newHash: string;
  status: 'PENDING' | 'SYNCED' | 'REJECTED';
}

interface FinovaDB extends DBSchema {
  transactions: {
    key: string;
    value: WalletTransaction;
    indexes: { 'by-user': string };
  };
  keyval: {
    key: string;
    value: any;
  }
}

let dbPromise: Promise<IDBPDatabase<FinovaDB>>;

export function getDB() {
  if (typeof window === 'undefined') return null; // Only run on client
  if (!dbPromise) {
    dbPromise = openDB<FinovaDB>('finova-wallet', 1, {
      upgrade(db) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('by-user', 'userId');
        db.createObjectStore('keyval');
      },
    });
  }
  return dbPromise;
}

export async function getBalance(userId: string): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  const txs = await db.getAllFromIndex('transactions', 'by-user', userId);
  return txs.filter(t => t.status !== 'REJECTED').reduce((acc, tx) => acc + tx.amount, 0);
}

export async function addTransaction(tx: WalletTransaction) {
  const db = await getDB();
  if (!db) return;
  // Replay protection check
  const existing = await db.get('transactions', tx.id);
  if (existing) {
    console.warn('Duplicate transaction detected:', tx.id);
    return false; // Prevent double applying
  }
  await db.put('transactions', tx);
  return true;
}

export async function getPendingTransactions(userId: string) {
  const db = await getDB();
  if (!db) return [];
  const txs = await db.getAllFromIndex('transactions', 'by-user', userId);
  return txs.filter(t => t.status === 'PENDING').sort((a, b) => a.sequence - b.sequence);
}

export async function setLocalState(key: string, value: any) {
  const db = await getDB();
  if (!db) return;
  await db.put('keyval', value, key);
}

export async function getLocalState(key: string) {
  const db = await getDB();
  if (!db) return null;
  return await db.get('keyval', key);
}

export async function updateTransactionStatus(txId: string, status: 'SYNCED' | 'REJECTED') {
  const db = await getDB();
  if (!db) return;
  const tx = await db.get('transactions', txId);
  if (tx) {
    tx.status = status;
    await db.put('transactions', tx);
  }
}
