'use client';

import { useState, useEffect } from 'react';
import { getBalance, addTransaction, getPendingTransactions, setLocalState, getLocalState } from '@/lib/idb';
import { decodeCriticalRecord, encodeCriticalRecord } from '@/domain/protocol';

export default function FarmerApp() {
  const [screen, setScreen] = useState('LOGIN');
  const [userId, setUserId] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [activePolicy, setActivePolicy] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);
  
  useEffect(() => {
    setOnline(navigator.onLine);
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));

    // Try to load cached session
    getLocalState('session_userId').then(uid => {
      if (uid) {
        setUserId(uid);
        setScreen('HOME');
        refreshData(uid);
      }
    });

    // Try to load cached products, then update from network
    getLocalState('cached_products').then(p => {
      if (p) setProducts(p);
    });

    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLocalState('cached_products', data);
      }).catch(() => console.log('Offline: Using cached products'));
  }, []);

  const refreshData = async (uid: string) => {
    const bal = await getBalance(uid);
    setBalance(bal);
    const pending = await getPendingTransactions(uid);
    setQueueCount(pending.length);
    const policy = await getLocalState(`activePolicy_${uid}`);
    if (policy) setActivePolicy(policy);
  };

  const login = async (uid: string) => {
    setUserId(uid);
    await setLocalState('session_userId', uid);
    setScreen('HOME');
    refreshData(uid);
  };

  const logout = async () => {
    setUserId('');
    setActivePolicy(null);
    await setLocalState('session_userId', null);
    setScreen('LOGIN');
  };

  const activatePolicy = async (p: any) => {
    setActivePolicy(p);
    await setLocalState(`activePolicy_${userId}`, p);
    setScreen('VOICE_DISCLOSURE');
  };

  const playVoice = () => {
    const text = `Your crop is insured. If rainfall is ${activePolicy.trigger.operator} ${activePolicy.trigger.threshold} mm, you get ₹${activePolicy.payout.amount}.`;
    const ut = new SpeechSynthesisUtterance(text);
    ut.onend = () => setScreen('UNDERSTANDING_CHECK');
    window.speechSynthesis.speak(ut);
  };

  const answerQuestion = async (correct: boolean) => {
    if (correct) {
      alert('Correct! Insurance Activated.');
      setScreen('WALLET');
    } else {
      alert('Incorrect. Please listen again.');
      setScreen('VOICE_DISCLOSURE');
    }
  };

  const spendOffline = async () => {
    if (balance < 250) return alert('Insufficient funds');
    await addTransaction({
      id: crypto.randomUUID(),
      userId,
      amount: -250,
      type: 'SPEND',
      timestamp: Date.now(),
      sequence: Date.now(), // naive sequence
      prevHash: 'dummy-prev',
      newHash: 'dummy-new',
      status: 'PENDING'
    });
    refreshData(userId);
  };

  const syncWallet = async () => {
    if (!online) return alert('Offline');
    const pending = await getPendingTransactions(userId);
    if (!pending.length) return alert('Nothing to sync');
    const res = await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(pending)
    });
    await res.json();
    alert('Sync complete!');
    // In a real app we update the tx status to SYNCED
    refreshData(userId);
  };

  const applyCriticalRecord = async (base64Str: string) => {
    try {
      const binaryString = atob(base64Str);
      const buf = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buf[i] = binaryString.charCodeAt(i);
      }
      const record = await decodeCriticalRecord(buf);
      const success = await addTransaction({
        id: `${record.policyId}-${record.sequence}`, // deterministic ID prevents double crediting
        userId,
        amount: record.payoutAmount,
        type: 'PAYOUT',
        timestamp: Date.now(),
        sequence: record.sequence,
        prevHash: 'hash',
        newHash: 'hash',
        status: 'PENDING'
      });
      if (success) {
        alert(`Offline Settlement Accepted! ₹${record.payoutAmount} added to wallet.`);
      } else {
        alert(`Duplicate offline settlement rejected.`);
      }
      refreshData(userId);
    } catch (e: any) {
      alert(`Invalid Settlement Record: ${e.message}`);
    }
  }

  const simulateOracle = async (readings: any[]) => {
    if (!online) { alert("Weather Oracle requires network"); return; }
    if (!activePolicy) { alert("Activate a policy first!"); return; }
    const res = await fetch('/api/weather/evaluate', {
      method: 'POST',
      body: JSON.stringify({ policy: activePolicy, readings, userId })
    });
    const data = await res.json();
    if (data.status === 'TRIGGERED' && data.criticalRecordBase64) {
      await applyCriticalRecord(data.criticalRecordBase64);
    } else {
      alert(`Status: ${data.status}`);
    }
  };

  const receiveOfflineSettlement = async () => {
    // Generate a valid critical record directly on the client to simulate NFC/Bluetooth payload reception
    const record = await encodeCriticalRecord({
      policyId: activePolicy?.productId || 'drought_shield',
      sequence: Date.now(),
      triggered: true,
      payoutAmount: 10000,
      oracleValue: 72
    });
    // Convert to base64
    let binary = '';
    for (let i = 0; i < record.byteLength; i++) binary += String.fromCharCode(record[i]);
    const b64 = btoa(binary);
    
    // Process it
    await applyCriticalRecord(b64);
  }

  return (
    <div className="max-w-md mx-auto p-4 font-sans text-gray-900">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">Finova Farmer</h1>
      <div className="text-sm mb-4">
        Network: <span className={online ? 'text-green-500' : 'text-red-500 font-bold'}>{online ? 'ONLINE' : 'OFFLINE (Full Access)'}</span> | 
        User: <span className="font-bold">{userId || 'None'}</span>
      </div>

      {screen === 'LOGIN' && (
        <div className="space-y-4">
          <button onClick={() => login('FarmerA')} className="w-full p-4 bg-blue-500 text-white rounded shadow cursor-pointer">Login as Farmer A</button>
          <button onClick={() => login('FarmerB')} className="w-full p-4 bg-green-500 text-white rounded shadow cursor-pointer">Login as Farmer B (Shared Phone)</button>
        </div>
      )}

      {screen === 'HOME' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Products</h2>
          {products.map(p => (
            <button key={p.productId} onClick={() => activatePolicy(p)} className="w-full p-4 bg-white border shadow rounded text-left cursor-pointer">
              <div className="font-bold">{p.name}</div>
              <div className="text-sm text-gray-500">Payout: ₹{p.payout.amount}</div>
            </button>
          ))}
          <button onClick={() => setScreen('WALLET')} className="w-full p-4 bg-purple-500 text-white rounded mt-4 shadow cursor-pointer">Go to Wallet</button>
          <button onClick={logout} className="w-full p-4 bg-red-500 text-white rounded shadow cursor-pointer">Lock / Handover Phone</button>
        </div>
      )}

      {screen === 'VOICE_DISCLOSURE' && (
        <div className="space-y-4 text-center mt-10">
          <h2 className="text-xl">Listen to Policy terms</h2>
          <button onClick={playVoice} className="p-6 bg-blue-500 text-white rounded-full mx-auto block shadow-lg cursor-pointer">🔊 Play Audio</button>
        </div>
      )}

      {screen === 'UNDERSTANDING_CHECK' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">When do you get paid?</h2>
          <button onClick={() => answerQuestion(false)} className="w-full p-4 border rounded bg-white shadow cursor-pointer">If it rains too much</button>
          <button onClick={() => answerQuestion(true)} className="w-full p-4 border rounded bg-green-50 border-green-200 shadow cursor-pointer">If rainfall is less than {activePolicy?.trigger.threshold}mm</button>
        </div>
      )}

      {screen === 'WALLET' && (
        <div className="space-y-4">
          <div className="p-6 bg-blue-50 border rounded text-center">
            <h2 className="text-lg">Offline Balance</h2>
            <div className="text-4xl font-bold text-blue-600">₹{balance}</div>
            <button onClick={spendOffline} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded shadow cursor-pointer">Spend ₹250 (Offline)</button>
          </div>
          
          <div className="p-4 border rounded bg-white">
            <h3 className="font-bold">Sync Queue: {queueCount}</h3>
            <button onClick={syncWallet} disabled={!online} className="mt-2 px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50 shadow cursor-pointer">Sync Now</button>
          </div>

          <div className="p-4 border rounded bg-gray-50">
            <h3 className="font-bold mb-2">Simulate Offline Handover</h3>
            <button onClick={receiveOfflineSettlement} className="w-full p-2 bg-gray-800 text-white rounded shadow cursor-pointer">
              📥 Receive 64-Byte Settlement (NFC/Bluetooth)
            </button>
            
            <h3 className="font-bold mt-4 mb-2">Simulate Weather Oracle (Online)</h3>
            <div className="flex gap-2 text-sm flex-wrap">
              <button onClick={() => simulateOracle([{source:'A', value: 72, timestamp: Date.now()}, {source:'B', value: 74, timestamp: Date.now()}, {source:'C', value: 71, timestamp: Date.now()}])} className="p-2 border rounded bg-white shadow cursor-pointer disabled:opacity-50" disabled={!online}>Healthy (72mm)</button>
              <button onClick={() => simulateOracle([{source:'A', value: 72, timestamp: Date.now()}, {source:'B', value: 74, timestamp: Date.now()}, {source:'C', value: 4, timestamp: Date.now()}])} className="p-2 border rounded bg-white shadow cursor-pointer disabled:opacity-50" disabled={!online}>Outlier (4mm)</button>
              <button onClick={() => simulateOracle([{source:'A', value: 72, timestamp: Date.now()}, {source:'B', value: 120, timestamp: Date.now()}, {source:'C', value: 4, timestamp: Date.now()}])} className="p-2 border rounded bg-white shadow cursor-pointer disabled:opacity-50" disabled={!online}>Disagreement (HOLD)</button>
            </div>
          </div>

          <button onClick={() => setScreen('HOME')} className="w-full p-4 text-gray-500 border rounded bg-white shadow cursor-pointer">Back</button>
        </div>
      )}
    </div>
  );
}
