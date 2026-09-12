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
  payload?: string;
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

import { ProductConfig } from '../domain/policy';

const DEFAULT_PRODUCTS: ProductConfig[] = [
  {
    id: "drought-shield-v1",
    version: 1,
    name: "Drought Shield",
    crop: "मूंगफली (Groundnut)",
    premium: 250,
    payout: 10000,
    coverageDays: 30,
    trigger: {
      index: "rainfall",
      aggregation: "median",
      operator: "<",
      threshold: 100,
      periodDays: 30
    },
    oracleConfig: {
      requiredSources: 3,
      minimumValidSources: 2,
      maxSourceAgeMs: 3600000,
      maxDisagreementTolerance: 50
    },
    ...({
      description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 100 mm से कम रहती है, तो आपको ₹10,000 का भुगतान मिलेगा। (If rainfall in your area is less than 100 mm during the coverage period, you will receive a payout of ₹10,000.)",
      voiceText: "यह सूखे से बचाव का बीमा है। यदि बीमा अवधि के दौरान आपके क्षेत्र में बारिश तय सीमा से कम रहती है, तो आपको दस हजार रुपये का भुगतान मिलेगा। (This is drought protection insurance. If rainfall is below the limit, you will get ten thousand rupees.)",
      status: "PUBLISHED"
    } as any)
  }
];

export async function getProducts(): Promise<ProductConfig[]> {
  const custom = await getLocalState('product_registry') || [];
  // Merge default products with custom, preferring custom if IDs match (though we version them)
  return [...DEFAULT_PRODUCTS, ...custom];
}

export async function saveProduct(product: ProductConfig) {
  const existing = await getLocalState('product_registry') || [];
  const idx = existing.findIndex((p: any) => p.id === product.id);
  if (idx >= 0) {
    existing[idx] = product;
  } else {
    existing.push(product);
  }
  await setLocalState('product_registry', existing);
}

import { EvaluationRecord } from '../domain/policy';

export async function saveEvaluation(record: EvaluationRecord) {
  const existing = await getLocalState('evaluations_registry') || [];
  existing.push(record);
  await setLocalState('evaluations_registry', existing);
}

export async function getEvaluations(): Promise<EvaluationRecord[]> {
  return await getLocalState('evaluations_registry') || [];
}

export interface WalletState {
  farmerId: string;
  balancePaise: number;
  sequenceNumber: number;
  walletId: string;
}

export async function getWalletState(userId: string): Promise<WalletState> {
  const db = await getDB();
  if (!db) return { farmerId: userId, balancePaise: 0, sequenceNumber: 0, walletId: `WALLET-${userId}` };
  const state = await db.get('keyval', `walletState_${userId}`);
  return state || { farmerId: userId, balancePaise: 0, sequenceNumber: 0, walletId: `WALLET-${userId}` };
}

export async function setWalletState(state: WalletState) {
  const db = await getDB();
  if (!db) return;
  await db.put('keyval', state, `walletState_${state.farmerId}`);
}

export async function processOfflineSpend(
  userId: string, 
  amountPaise: number, 
  transactionId: string, 
  balanceHash: string,
  payload: string
): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;
  
  const tx = db.transaction(['keyval', 'transactions'], 'readwrite');
  const state = (await tx.objectStore('keyval').get(`walletState_${userId}`)) as WalletState || {
    farmerId: userId, balancePaise: 0, sequenceNumber: 0, walletId: `WALLET-${userId}`
  };

  if (state.balancePaise < amountPaise) {
    tx.abort();
    return false;
  }

  state.balancePaise -= amountPaise;
  state.sequenceNumber += 1;

  const newTx: WalletTransaction = {
    id: transactionId,
    userId,
    amount: -amountPaise,
    type: 'SPEND',
    timestamp: Date.now(),
    sequence: state.sequenceNumber,
    prevHash: '',
    newHash: balanceHash,
    status: 'PENDING',
    payload
  };

  await tx.objectStore('keyval').put(state, `walletState_${userId}`);
  await tx.objectStore('transactions').put(newTx);
  await tx.done;

  return true;
}
