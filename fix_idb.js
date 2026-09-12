const fs = require('fs');

let idbCode = fs.readFileSync('src/lib/idb.ts', 'utf8');
if (!idbCode.includes('updateTransactionStatus')) {
  idbCode += `
export async function updateTransactionStatus(txId: string, status: 'SYNCED' | 'REJECTED') {
  const db = await getDB();
  if (!db) return;
  const tx = await db.get('transactions', txId);
  if (tx) {
    tx.status = status;
    await db.put('transactions', tx);
  }
}
`;
  fs.writeFileSync('src/lib/idb.ts', idbCode);
}
