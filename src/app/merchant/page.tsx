'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { verifyOfflineTransactionPayload } from '@/domain/protocol';
import { getDB } from '@/lib/idb';

export default function MerchantApp() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [manualPayload, setManualPayload] = useState('');
  const [pendingTxs, setPendingTxs] = useState<any[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => {
      setOnline(true);
      syncPending();
    };
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadPendingTxs();

    const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
    scanner.render(onScanSuccess, () => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      scanner.clear().catch(e => console.error(e));
    };
  }, []);

  const loadPendingTxs = async () => {
    const db = await getDB();
    if (!db) return;
    const txs = await db.getAll('keyval'); // Just use keyval for merchant transactions for demo
    const merchantTxs = txs.filter((t: any) => t && t.status === 'PENDING_SYNC_MERCHANT');
    setPendingTxs(merchantTxs);
  };

  
  const checkDuplicate = async (txId: string) => {
    const db = await getDB();
    if (!db) return false;
    const existing = await db.get('keyval', `merchant_tx_${txId}`);
    return !!existing;
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      const payload = await verifyOfflineTransactionPayload(decodedText);
      if (await checkDuplicate(payload.transactionId)) {
         setScanError('ALREADY_SCANNED');
         setScanResult(null);
         return;
      }
      setScanResult(payload);
      setScanError('');
      setAccepted(false);
    } catch (e: any) {
      setScanError('INVALID QR: ' + e.message);
      setScanResult(null);
    }
  };

  const handleManualSubmit = async () => {
    try {
      const payload = await verifyOfflineTransactionPayload(manualPayload);
      if (await checkDuplicate(payload.transactionId)) {
         setScanError('ALREADY_SCANNED');
         setScanResult(null);
         return;
      }
      setScanResult(payload);
      setScanError('');
      setAccepted(false);
    } catch (e: any) {
      setScanError('INVALID QR: ' + e.message);
      setScanResult(null);
    }  };

  const acceptPayment = async () => {
    if (!scanResult) return;
    setIsAccepting(true);
    
    const db = await getDB();
    if (db) {
      // Idempotency check locally
      const existing = await db.get('keyval', `merchant_tx_${scanResult.transactionId}`);
      if (!existing) {
        await db.put('keyval', {
          ...scanResult,
          status: 'PENDING_SYNC_MERCHANT',
          scannedAt: Date.now()
        }, `merchant_tx_${scanResult.transactionId}`);
      }
    }
    
    setAccepted(true);
    setIsAccepting(false);
    loadPendingTxs();
    
    if (online) {
      syncPending();
    }
  };

  const syncPending = async () => {
    if (syncing) return;
    setSyncing(true);
    const db = await getDB();
    if (!db) { setSyncing(false); return; }
    
    const txs = await db.getAll('keyval');
    const merchantTxs = txs.filter((t: any) => t && t.status === 'PENDING_SYNC_MERCHANT');
    
    for (const tx of merchantTxs) {
      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
        const data = await res.json();
        
        if (data.status === 'ACCEPTED' || data.status === 'ALREADY_PROCESSED') {
          tx.status = 'SYNCED';
          await db.put('keyval', tx, `merchant_tx_${tx.transactionId}`);
        }
      } catch (e) {
        console.error("Sync failed", e);
      }
    }
    loadPendingTxs();
    setSyncing(false);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans relative">
      <div className="p-6 bg-white shadow-sm border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🏪 Seed Seller</h1>
        <div className="text-sm font-medium mt-1 flex justify-between">
           <span className={online ? 'text-green-600' : 'text-orange-600'}>
             {online ? '🟢 Online' : '📡 Offline Mode'}
           </span>
           <button onClick={() => router.push('/')} className="text-blue-600">Switch Role</button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto pb-24">
        {!scanResult && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Scan Payment QR</h2>
            <div id="reader" className="w-full overflow-hidden rounded-2xl mb-4 border-2 border-gray-200"></div>
            
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-500 mb-2">Or Paste QR Payload (Testing)</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={manualPayload}
                  onChange={e => setManualPayload(e.target.value)}
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl"
                  placeholder="INSUREX1..."
                />
                <button onClick={handleManualSubmit} className="px-4 py-2 bg-gray-800 text-white font-bold rounded-xl">Verify</button>
              </div>
            </div>
            
            {scanError && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 font-bold rounded-xl text-center border border-red-200">
                {scanError}
              </div>
            )}
          </div>
        )}

        {scanResult && !accepted && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">💳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Received</h2>
            
            <div className="space-y-4 text-left bg-gray-50 p-4 rounded-2xl mb-6">
               <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-bold text-green-600 text-xl">₹{(scanResult.amountPaise / 100).toLocaleString()}</span></div>
               <div className="flex justify-between"><span className="text-gray-500">Transaction</span><span className="font-mono text-sm">{scanResult.transactionId}</span></div>
               <div className="flex justify-between"><span className="text-gray-500">Sequence</span><span className="font-bold">{scanResult.sequenceNumber}</span></div>
               <div className="flex justify-between"><span className="text-gray-500">Farmer</span><span className="font-bold capitalize">{scanResult.farmerId}</span></div>
            </div>
            
            <div className="p-3 bg-green-50 text-green-700 font-bold rounded-xl mb-6 border border-green-200">
              ✓ Signature Valid
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setScanResult(null)} className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-2xl">Cancel</button>
              <button onClick={acceptPayment} disabled={isAccepting} className="flex-2 p-4 bg-green-600 text-white font-bold rounded-2xl">[भुगतान स्वीकार करें]</button>
            </div>
          </div>
        )}

        {accepted && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ भुगतान दर्ज हो गया</h2>
            <div className="text-4xl font-extrabold text-green-600 my-4">₹{(scanResult.amountPaise / 100).toLocaleString()}</div>
            <div className="font-mono text-gray-500 text-sm mb-6">{scanResult.transactionId}</div>
            
            <div className="p-4 bg-orange-50 text-orange-700 font-bold rounded-2xl mb-6 border border-orange-200 flex flex-col gap-1">
              <span>📡 ऑफ़लाइन</span>
              <span className="text-sm">⏳ Sync बाकी</span>
            </div>
            
            <button onClick={() => { setScanResult(null); setAccepted(false); }} className="w-full p-4 bg-gray-900 text-white font-bold rounded-2xl">Scan Another</button>
          </div>
        )}

        {pendingTxs.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Pending Sync Queue</h3>
               {syncing && <span className="text-blue-500 text-xs font-bold animate-pulse">Syncing...</span>}
            </div>
            <div className="space-y-3">
               {pendingTxs.map((tx, idx) => (
                 <div key={idx} className="p-3 bg-orange-50 rounded-xl flex justify-between items-center border border-orange-100">
                   <div className="flex flex-col">
                     <span className="font-bold text-gray-900">₹{(tx.amountPaise / 100).toLocaleString()}</span>
                     <span className="text-xs text-gray-500 font-mono">{tx.transactionId}</span>
                   </div>
                   <span className="text-xs font-bold text-orange-600">⏳ PENDING</span>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
