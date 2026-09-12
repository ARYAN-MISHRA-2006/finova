'use client';

import { useState, useEffect } from 'react';
import { setLocalState, getLocalState, getBalance, addTransaction, getPendingTransactions, updateTransactionStatus, WalletTransaction } from '@/lib/idb';
import { ProductConfig, Policy, bindPolicy, evaluatePolicy, EvaluationRecord } from '@/domain/policy';
import { validateReading, OracleReading } from '@/domain/oracle';

const ICONS = ['🌾', '🏠', '💧', '🐄', '☀️'];
const PASSWORDS = {
  Ramu: ['🌾', '💧', '🏠'],
  Sita: ['🐄', '☀️', '💧']
};

const AVAILABLE_PRODUCTS: ProductConfig[] = [
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
    // Adding UI fields not strictly in engine config but needed for display
    ...({
      description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 100 mm से कम रहती है, तो आपको ₹10,000 का भुगतान मिलेगा।",
      voiceText: "यह सूखे से बचाव का बीमा है। यदि बीमा अवधि के दौरान आपके क्षेत्र में बारिश तय सीमा से कम रहती है, तो आपको दस हजार रुपये का भुगतान मिलेगा। इस बीमा की कीमत दो सौ पचास रुपये है और इसकी अवधि तीस दिन है।",
      status: "PUBLISHED"
    } as any)
  },
  {
    id: "flood-protect-v1",
    version: 1,
    name: "Flood Protect",
    crop: "धान (Paddy)",
    premium: 300,
    payout: 15000,
    coverageDays: 60,
    trigger: {
      index: "rainfall",
      aggregation: "median",
      operator: ">",
      threshold: 300,
      periodDays: 60
    },
    oracleConfig: {
      requiredSources: 3,
      minimumValidSources: 2,
      maxSourceAgeMs: 3600000,
      maxDisagreementTolerance: 50
    },
    ...({
      description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 300 mm से अधिक होती है, तो आपको ₹15,000 का भुगतान मिलेगा।",
      voiceText: "",
      status: "DRAFT"
    } as any)
  }
];

export default function FarmerApp() {
  const [screen, setScreen] = useState<'LOGIN_PROFILES' | 'IMAGE_AUTH' | 'MAIN_APP'>('LOGIN_PROFILES');
  const [tab, setTab] = useState('HOME');
  
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<'Ramu' | 'Sita' | null>(null);
  const [sequence, setSequence] = useState<string[]>([]);
  const [authError, setAuthError] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  
  // App state
  const [online, setOnline] = useState(true);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [spendAmount, setSpendAmount] = useState('');
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [evaluationRecord, setEvaluationRecord] = useState<EvaluationRecord | null>(null);
  
  // Insurance Flow States
  const [insuranceView, setInsuranceView] = useState<'LIST' | 'DETAILS' | 'COMPREHENSION' | 'BINDING_REVIEW' | 'ACTIVE_POLICY'>('LIST');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [compAnswerStatus, setCompAnswerStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [isListeningForAnswer, setIsListeningForAnswer] = useState(false);
  const [isBinding, setIsBinding] = useState(false);

  // Oracle Simulation States
  const [oracleMode, setOracleMode] = useState<'NORMAL' | 'NO_TRIGGER' | 'OUTLIER' | 'STALE' | 'NONRESPONSIVE' | 'DISAGREEMENT'>('NORMAL');

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
    };
    const handleOffline = () => {
      setOnline(false);
    };
    
    setOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getLocalState('session_userId').then(uid => {
      if (uid === 'Ramu' || uid === 'Sita') {
        setUserId(uid);
        setScreen('MAIN_APP');
        loadPolicyForUser(uid);
        loadWalletData(uid);
        
        // Give initial 10k if empty (just for demo purposes to match requirements)
        // In a real app this would come from a payout event
        getBalance(uid).then(async bal => {
          if (bal === 0) {
            const pending = await getPendingTransactions(uid);
            if (pending.length === 0) {
               await addTransaction({
                 id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                 userId: uid,
                 amount: 10000,
                 type: 'PAYOUT',
                 timestamp: Date.now(),
                 sequence: 0,
                 prevHash: '0x0',
                 newHash: '0x1',
                 status: 'SYNCED'
               });
               loadWalletData(uid);
            }
          }
        });
      } else if (uid) {
        setLocalState('session_userId', null);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveOnline = online && !simulatedOffline;

  // Auto-sync when coming back online
  useEffect(() => {
    if (effectiveOnline && userId && screen === 'MAIN_APP') {
      syncPendingTransactions(userId);
    }
  }, [effectiveOnline, userId, screen]);

  const loadWalletData = async (uid: string) => {
    const bal = await getBalance(uid);
    setBalance(bal);
    const pending = await getPendingTransactions(uid);
    setTransactions(pending);
  };

  const syncPendingTransactions = async (uid: string) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const pending = await getPendingTransactions(uid);
      for (const tx of pending) {
        // Simulate network request
        await new Promise(r => setTimeout(r, 800));
        await updateTransactionStatus(tx.id, 'SYNCED');
      }
      loadWalletData(uid);
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSpend = async () => {
    if (!userId) return;
    const amount = parseInt(spendAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
       alert("Invalid amount or insufficient balance.");
       return;
    }

    const tx: WalletTransaction = {
      id: `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      userId: userId,
      amount: -amount,
      type: 'SPEND',
      timestamp: Date.now(),
      sequence: Date.now(),
      prevHash: '0x...',
      newHash: '0x...',
      status: 'PENDING'
    };

    await addTransaction(tx);
    setSpendAmount('');
    await loadWalletData(userId);
    
    // Attempt immediate sync if online
    if (effectiveOnline) {
      syncPendingTransactions(userId);
    }
  };


  const loadPolicyForUser = async (uid: string) => {
    const policy = await getLocalState(`policy_${uid}`);
    if (policy) {
      setActivePolicy(policy);
      const evalRec = await getLocalState(`eval_${policy.policyId}`);
      if (evalRec) setEvaluationRecord(evalRec);
    } else {
      setActivePolicy(null);
      setEvaluationRecord(null);
    }
  };

  const handleProfileSelect = (name: 'Ramu' | 'Sita') => {
    setSelectedProfile(name);
    setSequence([]);
    setAuthError(false);
    setAuthSuccess(false);
    setScreen('IMAGE_AUTH');
  };

  const handleImageTap = (icon: string) => {
    if (!sequence.includes(icon) && sequence.length < 3) {
      setSequence([...sequence, icon]);
      setAuthError(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedProfile) return;
    const correctSequence = PASSWORDS[selectedProfile];
    if (sequence.join('') === correctSequence.join('')) {
      setAuthSuccess(true);
      setAuthError(false);
      setTimeout(async () => {
        setUserId(selectedProfile);
        await setLocalState('session_userId', selectedProfile);
        await loadPolicyForUser(selectedProfile);
        setScreen('MAIN_APP');
        setAuthSuccess(false);
      }, 1200);
    } else {
      setAuthError(true);
    }
  };

  const handleClear = () => {
    setSequence([]);
    setAuthError(false);
  };

  const handleLogout = async () => {
    setUserId(null);
    setSelectedProfile(null);
    setSequence([]);
    setTab('HOME');
    setAuthSuccess(false);
    setActivePolicy(null);
    setEvaluationRecord(null);
    setInsuranceView('LIST');
    await setLocalState('session_userId', null);
    setScreen('LOGIN_PROFILES');
  };

  const speakDescription = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.onend = () => { setIsPlayingAudio(false); setIsAudioPaused(false); };
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
      setIsAudioPaused(false);
    } else {
      alert("आवाज़ उपलब्ध नहीं है। नीचे दी गई जानकारी पढ़ें। (Voice not available. Please read the information below.)");
    }
  };

  const pauseAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsAudioPaused(true);
    }
  };

  const resumeAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setIsAudioPaused(false);
    }
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setIsAudioPaused(false);
    }
  };

  const startVoiceAnswer = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("आपके डिवाइस में बोलकर जवाब देने की सुविधा नहीं है। कृपया नंबर चुनें। (Voice recognition not supported. Please select a number.)");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => setIsListeningForAnswer(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      if (transcript.includes('दस हजार') || transcript.includes('दस हज़ार') || transcript.includes('10000') || transcript.includes('ten thousand')) {
         setCompAnswerStatus('CORRECT');
      } else {
         setCompAnswerStatus('WRONG');
      }
    };
    recognition.onerror = () => {
       alert("हम आपकी आवाज़ समझ नहीं पाए। (We could not understand your answer.)");
       setIsListeningForAnswer(false);
    };
    recognition.onend = () => setIsListeningForAnswer(false);
    recognition.start();
  };

  const handleBindPolicy = async () => {
    if (!userId || !selectedProduct || isBinding) return;
    setIsBinding(true);

    try {
      const existing = await getLocalState(`policy_${userId}`);
      if (existing) {
        setActivePolicy(existing);
        setInsuranceView('ACTIVE_POLICY');
        return;
      }

      const newPolicy = bindPolicy(selectedProduct, userId);
      await setLocalState(`policy_${userId}`, newPolicy);
      setActivePolicy(newPolicy);
      setInsuranceView('ACTIVE_POLICY');
    } finally {
      setIsBinding(false);
    }
  };

  const handleSimulateOracle = async () => {
    if (!activePolicy || !selectedProduct) return;
    const now = Date.now();
    let inputs: any[] = [];
    
    switch (oracleMode) {
      case 'NORMAL': inputs = [{ id: 'A', v: 72 }, { id: 'B', v: 74 }, { id: 'C', v: 71 }]; break;
      case 'NO_TRIGGER': inputs = [{ id: 'A', v: 120 }, { id: 'B', v: 125 }, { id: 'C', v: 122 }]; break;
      case 'OUTLIER': inputs = [{ id: 'A', v: 72 }, { id: 'B', v: 74 }, { id: 'C', v: 4 }]; break;
      case 'STALE': inputs = [{ id: 'A', v: 72 }, { id: 'B', v: 74 }, { id: 'C', v: 71, age: 2 * 60 * 60 * 1000 }]; break;
      case 'NONRESPONSIVE': inputs = [{ id: 'A', v: 72 }, { id: 'B', v: 74 }, { id: 'C', v: null }]; break;
      case 'DISAGREEMENT': inputs = [{ id: 'A', v: 40 }, { id: 'B', v: 100 }, { id: 'C', v: 150 }]; break;
    }

    const readings = inputs.map(i => validateReading({
      sourceId: i.id,
      value: i.v,
      timestamp: now - (i.age || 0)
    }, now, selectedProduct.oracleConfig.maxSourceAgeMs));
    
    const record = evaluatePolicy(activePolicy, readings, selectedProduct.oracleConfig);
    setEvaluationRecord(record);
    await setLocalState(`eval_${activePolicy.policyId}`, record);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans relative">
      
      {screen === 'LOGIN_PROFILES' && (
        <div className="flex-1 p-6 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">अपनी प्रोफ़ाइल चुनें (Select your profile)</h1>
          <div className="space-y-6">
            <button onClick={() => handleProfileSelect('Ramu')} className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl shadow-sm flex items-center cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mr-4">🌾</div>
              <span className="text-2xl font-bold text-gray-800">Ramu</span>
            </button>
            <button onClick={() => handleProfileSelect('Sita')} className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl shadow-sm flex items-center cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mr-4">🐄</div>
              <span className="text-2xl font-bold text-gray-800">Sita</span>
            </button>
          </div>
        </div>
      )}

      {screen === 'IMAGE_AUTH' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">अपनी पहचान सत्यापित करें (Verify your identity)</h2>
          <p className="text-gray-500 mb-8 text-center">अपने चित्रों को सही क्रम में चुनें (Select your pictures in the correct order)</p>
          
          <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-[300px]">
            {ICONS.map(icon => (
              <button 
                key={icon} 
                onClick={() => handleImageTap(icon)}
                className={`aspect-square border-2 rounded-2xl shadow-sm text-4xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${sequence.includes(icon) ? 'ring-4 ring-blue-500 bg-blue-50 border-blue-500' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
              >
                {icon}
              </button>
            ))}
          </div>

          <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <p className="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wider">आपका क्रम (Your sequence):</p>
            <div className="flex justify-center gap-4 h-12 items-center text-3xl">
              {sequence.map((icon, idx) => <span key={idx}>{icon}</span>)}
              {sequence.length === 0 && <span className="text-gray-300 text-lg">खाली (Empty)</span>}
            </div>
          </div>

          <div className="h-16 w-full flex items-center justify-center mb-6">
            {authError && <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl flex items-center w-full justify-center text-lg shadow-sm border border-red-100 h-full">❌ गलत क्रम (Wrong Sequence)</div>}
            {authSuccess && <div className="p-4 bg-green-50 text-green-700 font-bold rounded-xl flex items-center w-full justify-center text-lg shadow-sm border border-green-100 h-full">✅ पहचान सफल</div>}
          </div>

          <div className="flex gap-4 w-full">
            <button onClick={handleClear} className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-xl cursor-pointer">साफ़ करें (Clear)</button>
            {authError ? (
              <button onClick={handleClear} className="flex-[2] p-4 bg-red-600 text-white font-bold rounded-xl shadow-md cursor-pointer">फिर से प्रयास करें (Try Again)</button>
            ) : (
              <button onClick={handleVerify} disabled={sequence.length !== 3 || authSuccess} className="flex-[2] p-4 bg-green-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:shadow-none cursor-pointer transition-opacity">सत्यापित करें (Verify)</button>
            )}
          </div>
          
          <button onClick={() => setScreen('LOGIN_PROFILES')} className="mt-8 text-gray-500 font-medium cursor-pointer">← प्रोफ़ाइल पर वापस जाएं (Back to profiles)</button>
        </div>
      )}

      {screen === 'MAIN_APP' && (
        <>
          <div className="flex-1 overflow-y-auto pb-24 bg-gray-50">
            {!online && <div className="bg-orange-500 text-white text-center py-2 font-bold text-sm shadow-sm flex items-center justify-center gap-2">📡 ऑफ़लाइन (Offline Mode)</div>}
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">नमस्ते, {userId === 'Ramu' ? 'रामू' : 'सीता'} 👋 (Hello)</h1>
                </div>
                <div className="bg-white p-2 rounded-full shadow-sm">{effectiveOnline ? '📡' : '⚠️'}</div>
              </div>

              {tab === 'HOME' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 opacity-50"></div>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                      <h2 className="text-xl font-bold text-gray-800">आपका बीमा (Your Insurance)</h2>
                    </div>

                    {!activePolicy ? (
                      <div className="text-center py-6">
                        <p className="text-gray-500 mb-4">आपके पास कोई सक्रिय बीमा नहीं है। (No active insurance)</p>
                        <button onClick={() => { setTab('INSURANCE'); setInsuranceView('LIST'); }} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl shadow-sm">नया बीमा लें (Get Insurance)</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                          <span className="text-gray-500 font-medium">स्थिति (Status)</span>
                          <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">🟢 {activePolicy.status === 'ACTIVE' ? 'सक्रिय (Active)' : activePolicy.status}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                          <span className="text-gray-500 font-medium">फ़सल (Crop)</span>
                          <span className="font-bold text-gray-800 flex items-center gap-2">🌾 {activePolicy.crop}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                          <span className="text-gray-500 font-medium">प्रीमियम (Premium)</span>
                          <span className="font-bold text-gray-800">₹{activePolicy.premium}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-gray-500 font-medium">💰 भुगतान (Payout)</span>
                          <span className="text-2xl font-extrabold text-green-600">₹{activePolicy.payoutAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-400 text-center mt-2 font-mono">{activePolicy.policyId}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'INSURANCE' && (
                <div className="space-y-6">
                  {insuranceView === 'LIST' && (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">उपलब्ध बीमा (Available Insurance)</h2>
                        <p className="text-gray-500">अपने लिए सही बीमा चुनें (Choose the right insurance for you)</p>
                      </div>
                      
                      <div className="space-y-4">
                        {AVAILABLE_PRODUCTS.filter((p: any) => p.status === 'PUBLISHED').map(p => (
                          <div key={p.id} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                              <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                              <div className="flex justify-between items-center"><span className="text-gray-500">फ़सल (Crop)</span><span className="font-bold">🌾 {p.crop}</span></div>
                              <div className="flex justify-between items-center"><span className="text-gray-500">प्रीमियम (Premium)</span><span className="font-bold text-orange-600">₹{p.premium}</span></div>
                              <div className="flex justify-between items-center"><span className="text-gray-500">भुगतान (Payout)</span><span className="font-bold text-green-600">₹{p.payout.toLocaleString()}</span></div>
                              <div className="flex justify-between items-center"><span className="text-gray-500">अवधि (Duration)</span><span className="font-bold">{p.coverageDays} दिन</span></div>
                            </div>
                            
                            <button onClick={() => { setSelectedProduct(p); setInsuranceView('DETAILS'); }} className="w-full p-4 bg-green-600 text-white font-bold rounded-2xl cursor-pointer">विवरण देखें (View Details)</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {insuranceView === 'DETAILS' && selectedProduct && (
                    <>
                      <button onClick={() => { setInsuranceView('LIST'); stopAudio(); }} className="text-gray-500 font-medium mb-4 flex items-center gap-2 cursor-pointer">← वापस (Back)</button>
                      <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                          <h2 className="text-2xl font-bold text-gray-800">{selectedProduct.name}</h2>
                        </div>

                        <div className="space-y-4 text-lg">
                          <div className="flex justify-between"><span className="text-gray-500">🌾 फसल</span><span className="font-bold">{selectedProduct.crop}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">💰 प्रीमियम</span><span className="font-bold text-orange-600">₹{selectedProduct.premium}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">📅 अवधि</span><span className="font-bold">{selectedProduct.coverageDays} दिन</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">🌧️ ट्रिगर</span><span className="font-bold">{selectedProduct.trigger.index} {selectedProduct.trigger.operator} {selectedProduct.trigger.threshold} mm</span></div>
                          <div className="flex justify-between border-t border-gray-100 pt-4"><span className="text-gray-500">💵 भुगतान</span><span className="font-bold text-green-600 text-xl">₹{selectedProduct.payout.toLocaleString()}</span></div>
                        </div>

                        <div className="mt-8 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900 leading-relaxed font-medium">{(selectedProduct as any).description}</div>

                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🔊 इस बीमा के बारे में सुनें (Listen)</h3>
                          {!isPlayingAudio ? (
                            <button onClick={() => speakDescription((selectedProduct as any).voiceText)} className="w-full p-4 bg-gray-100 text-gray-800 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer">🔊 सुनें (Listen)</button>
                          ) : (
                            <div className="flex gap-2">
                              {isAudioPaused ? (
                                <button onClick={resumeAudio} className="flex-1 p-4 bg-blue-100 text-blue-800 font-bold rounded-2xl cursor-pointer text-sm">▶️ जारी रखें</button>
                              ) : (
                                <button onClick={pauseAudio} className="flex-1 p-4 bg-yellow-100 text-yellow-800 font-bold rounded-2xl cursor-pointer text-sm">⏸️ रोकें</button>
                              )}
                              <button onClick={() => { stopAudio(); speakDescription((selectedProduct as any).voiceText); }} className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-2xl cursor-pointer text-sm">🔁 दोबारा</button>
                              <button onClick={stopAudio} className="flex-1 p-4 bg-red-100 text-red-800 font-bold rounded-2xl cursor-pointer text-sm">⏹️ बंद</button>
                            </div>
                          )}
                        </div>

                        <div className="mt-8 pt-4">
                          <button onClick={() => { stopAudio(); setInsuranceView('COMPREHENSION'); setCompAnswerStatus('IDLE'); }} className="w-full p-5 bg-green-600 text-white font-bold text-xl rounded-2xl shadow-lg cursor-pointer">[बीमा लें] (Buy Insurance)</button>
                        </div>
                      </div>
                    </>
                  )}

                  {insuranceView === 'COMPREHENSION' && (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">पहले समझें (Understand First)</h2>
                        <p className="text-gray-500">बीमा सक्रिय करने से पहले एक सवाल का जवाब दें। (Answer a question before activating.)</p>
                      </div>

                      <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                        <p className="text-xl font-bold text-gray-800 mb-8 text-center leading-relaxed">
                          "अगर बारिश 100 mm से कम हुई तो आपको कितना भुगतान मिलेगा?"<br/>
                          <span className="text-sm font-normal text-gray-500">(If rain is less than 100 mm, how much payout will you get?)</span>
                        </p>

                        {compAnswerStatus === 'IDLE' || compAnswerStatus === 'WRONG' ? (
                          <div className="space-y-4">
                            <button onClick={() => setCompAnswerStatus('WRONG')} className="w-full p-5 border-2 border-gray-200 rounded-2xl text-xl font-bold text-gray-700 cursor-pointer hover:bg-gray-50">₹1,000</button>
                            <button onClick={() => setCompAnswerStatus('WRONG')} className="w-full p-5 border-2 border-gray-200 rounded-2xl text-xl font-bold text-gray-700 cursor-pointer hover:bg-gray-50">₹5,000</button>
                            <button onClick={() => setCompAnswerStatus('CORRECT')} className="w-full p-5 border-2 border-gray-200 rounded-2xl text-xl font-bold text-gray-700 cursor-pointer hover:bg-gray-50">₹10,000</button>
                            
                            <div className="relative flex py-5 items-center">
                              <div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 font-bold">या (OR)</span><div className="flex-grow border-t border-gray-200"></div>
                            </div>
                            
                            <button onClick={startVoiceAnswer} className={`w-full p-5 rounded-2xl text-xl font-bold cursor-pointer transition-all ${isListeningForAnswer ? 'bg-red-100 text-red-600 border-2 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-800 border-2 border-blue-200'}`}>🎤 {isListeningForAnswer ? 'सुन रहा है... (Listening...)' : 'बोलकर जवाब दें (Answer by Voice)'}</button>
                          </div>
                        ) : null}

                        {compAnswerStatus === 'WRONG' && (
                          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                            <div className="text-xl font-bold text-red-700 mb-2">❌ सही नहीं है (Incorrect)</div>
                            <p className="text-red-600 mb-4">कृपया फिर से प्रयास करें। (Please try again.)</p>
                            <button onClick={() => setInsuranceView('DETAILS')} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl cursor-pointer">🔊 फिर से सुनें (Listen Again)</button>
                          </div>
                        )}

                        {compAnswerStatus === 'CORRECT' && (
                          <div className="mt-6 p-6 bg-green-50 border border-green-100 rounded-2xl text-center">
                            <div className="text-2xl font-bold text-green-700 mb-4">✅ सही उत्तर (Correct)</div>
                            <p className="text-green-800 font-medium mb-6">आपने बीमा की शर्तें समझ ली हैं। (You have understood the policy terms.)</p>
                            <button onClick={() => setInsuranceView('BINDING_REVIEW')} className="w-full p-5 bg-green-600 text-white font-bold text-xl rounded-2xl cursor-pointer shadow-md">[आगे बढ़ें] (Continue)</button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {insuranceView === 'BINDING_REVIEW' && selectedProduct && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 text-center">
                       <h2 className="text-2xl font-bold text-gray-900 mb-6">पुष्टि करें (Confirm)</h2>
                       
                       <div className="space-y-4 text-lg mb-8">
                          <div className="flex flex-col p-4 bg-gray-50 rounded-2xl">
                             <span className="text-gray-500 mb-1">प्रीमियम (Premium)</span>
                             <span className="font-bold text-2xl text-orange-600">₹{selectedProduct.premium}</span>
                          </div>
                          <div className="flex flex-col p-4 bg-gray-50 rounded-2xl">
                             <span className="text-gray-500 mb-1">संभावित भुगतान (Possible Payout)</span>
                             <span className="font-bold text-2xl text-green-600">₹{selectedProduct.payout.toLocaleString()}</span>
                          </div>
                       </div>

                       <button 
                         onClick={handleBindPolicy} 
                         disabled={isBinding}
                         className="w-full p-5 bg-blue-600 text-white font-bold text-xl rounded-2xl cursor-pointer shadow-md disabled:opacity-50"
                       >
                         {isBinding ? 'प्रतीक्षा करें... (Wait...)' : '[बीमा सक्रिय करें] (Activate Insurance)'}
                       </button>
                    </div>
                  )}

                  {insuranceView === 'ACTIVE_POLICY' && activePolicy && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-3xl p-6 shadow-md border border-green-200 bg-green-50/30">
                        <div className="text-center mb-6">
                          <div className="text-5xl mb-4">✅</div>
                          <h2 className="text-xl font-bold text-green-800">आपका बीमा सक्रिय हो गया। (Your insurance is active.)</h2>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          <div className="font-bold text-lg border-b border-gray-200 pb-2">{activePolicy.productId.toUpperCase()}</div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">फ़सल</span><span className="font-bold">🌾 {activePolicy.crop}</span></div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">प्रीमियम</span><span className="font-bold text-orange-600">₹{activePolicy.premium}</span></div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">भुगतान</span><span className="font-bold text-green-600">₹{activePolicy.payoutAmount.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">स्थिति</span><span className="bg-green-100 text-green-800 font-bold px-2 py-1 rounded-md text-xs">🟢 {activePolicy.status === 'ACTIVE' ? 'सक्रिय' : activePolicy.status}</span></div>
                        </div>
                        
                        <div className="text-center font-mono text-gray-500 text-sm p-3 bg-gray-100 rounded-xl">
                          {activePolicy.policyId}
                        </div>
                      </div>

                      {/* Oracle Evaluation Simulation */}
                      <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                         <h3 className="text-lg font-bold text-gray-900 mb-4">Oracle Testing (Simulate Evaluation)</h3>
                         <div className="grid grid-cols-2 gap-2 mb-4">
                            <button onClick={() => setOracleMode('NORMAL')} className={`p-2 text-sm font-bold rounded-lg border ${oracleMode === 'NORMAL' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}>Normal Trigger</button>
                            <button onClick={() => setOracleMode('NO_TRIGGER')} className={`p-2 text-sm font-bold rounded-lg border ${oracleMode === 'NO_TRIGGER' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}>No Trigger</button>
                            <button onClick={() => setOracleMode('OUTLIER')} className={`p-2 text-sm font-bold rounded-lg border ${oracleMode === 'OUTLIER' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}>Outlier C=4</button>
                            <button onClick={() => setOracleMode('STALE')} className={`p-2 text-sm font-bold rounded-lg border ${oracleMode === 'STALE' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}>Stale C</button>
                            <button onClick={() => setOracleMode('NONRESPONSIVE')} className={`p-2 text-sm font-bold rounded-lg border ${oracleMode === 'NONRESPONSIVE' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}>Timeout C</button>
                            <button onClick={() => setOracleMode('DISAGREEMENT')} className={`p-2 text-sm font-bold rounded-lg border ${oracleMode === 'DISAGREEMENT' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gray-50'}`}>Disagreement</button>
                         </div>
                         <button onClick={handleSimulateOracle} className="w-full p-4 bg-purple-600 text-white font-bold rounded-xl shadow-md cursor-pointer">
                            Run Policy Engine ⚙️
                         </button>

                         {evaluationRecord && (
                            <div className="mt-6 p-4 bg-gray-900 text-green-400 font-mono text-xs rounded-xl overflow-x-auto">
                               <div className="mb-2 flex items-center justify-between">
                                 <span className="text-white font-bold">Decision: {evaluationRecord.decision === 'TRIGGER' ? '🟢 TRIGGER' : evaluationRecord.decision === 'HOLD' ? '🟠 HOLD' : '🔵 NO_TRIGGER'}</span>
                               </div>
                               {evaluationRecord.reason && <div className="text-red-400 mb-2">Reason: {evaluationRecord.reason}</div>}
                               
                               <div className="mb-2 text-gray-400">Oracle Readings:</div>
                               {evaluationRecord.oracleReadings.map(r => (
                                 <div key={r.sourceId}>
                                   Oracle {r.sourceId}: {r.value} mm {r.status !== 'RESPONDING' ? <span className="text-red-400">({r.status})</span> : ''}
                                 </div>
                               ))}
                               <div className="mt-2 pt-2 border-t border-gray-700">
                                 Aggregated ({evaluationRecord.aggregationMethod}): {evaluationRecord.aggregatedValue} <br/>
                                 Rule: {evaluationRecord.aggregatedValue} {evaluationRecord.rule.operator} {evaluationRecord.rule.threshold} <br/>
                                 Payout: ₹{evaluationRecord.payoutAmount}
                               </div>
                               
                               {evaluationRecord.decision === 'TRIGGER' && (
                                 <div className="mt-4 p-3 bg-green-900 text-green-100 rounded-lg text-center font-sans font-bold text-sm">
                                    🟢 आपके बीमा की शर्त पूरी हो गई है। <br/>
                                    <span className="text-xs font-normal opacity-75">(Payment settlement logic coming in next phase)</span>
                                 </div>
                               )}
                            </div>
                         )}
                      </div>
                    </div>
                  )}

                </div>
              )}

                            {tab === 'WALLET' && (
                <div className="space-y-6">
                  {/* Offline / Dev Simulator Header */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-100 p-4 rounded-2xl flex items-center justify-between border border-gray-200">
                       <span className="font-bold text-gray-700 text-sm">Network Simulator (Dev Only)</span>
                       <button 
                         onClick={() => setSimulatedOffline(!simulatedOffline)}
                         className={`px-4 py-2 rounded-xl font-bold text-sm ${simulatedOffline ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
                       >
                         {simulatedOffline ? '🔴 OFFLINE' : '🟢 ONLINE'}
                       </button>
                    </div>
                  )}

                  <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50"></div>
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">💰</div>
                      <h2 className="text-xl font-bold text-gray-800">मेरा वॉलेट (My Wallet)</h2>
                    </div>
                    <div className="text-5xl font-extrabold text-gray-900 my-6">₹{balance.toLocaleString()}</div>
                    <div className="text-gray-500 font-medium">उपलब्ध राशि (Available Balance)</div>
                    
                    {!effectiveOnline && (
                      <div className="mt-4 text-orange-500 font-bold flex items-center justify-center gap-2">
                        📡 ऑफ़लाइन (Offline Mode)
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 text-lg">पैसे खर्च करें (Spend Money)</h3>
                    <div className="flex gap-4">
                       <input 
                         type="number" 
                         value={spendAmount}
                         onChange={e => setSpendAmount(e.target.value)}
                         placeholder="₹ Amount"
                         className="flex-1 p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-xl font-bold focus:outline-none focus:border-blue-500"
                       />
                       <button 
                         onClick={handleSpend}
                         disabled={!spendAmount || parseInt(spendAmount) > balance || parseInt(spendAmount) <= 0}
                         className="px-6 py-2 bg-blue-600 text-white font-bold rounded-2xl shadow-md disabled:opacity-50"
                       >
                         Spend
                       </button>
                    </div>
                  </div>

                  {transactions.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 text-lg">हाल के लेन-देन</h3>
                        {isSyncing && <span className="text-blue-500 text-sm font-bold animate-pulse">Syncing...</span>}
                      </div>
                      <div className="space-y-3">
                         {transactions.map(tx => (
                           <div key={tx.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 text-sm">{tx.id}</span>
                                <span className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {tx.amount > 0 ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString()}
                                </span>
                                {tx.status === 'PENDING' ? (
                                  <span className="text-xs font-bold text-orange-500">⏳ Pending Sync</span>
                                ) : (
                                  <span className="text-xs font-bold text-green-500">✅ Synced</span>
                                )}
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {tab === 'PROFILE' && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">प्रोफ़ाइल (Profile)</h2>
                  <button onClick={handleLogout} className="w-full p-4 bg-red-100 text-red-700 font-bold rounded-2xl">
                    लॉग आउट (Log Out / Handover)
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] max-w-md mx-auto">
            <button onClick={() => { setTab('HOME'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'HOME' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">🏠</span><span className="text-xs font-bold">होम</span></button>
            <button onClick={() => { setTab('INSURANCE'); stopAudio(); if(activePolicy) setInsuranceView('ACTIVE_POLICY'); else if(insuranceView as any === 'BINDING_PLACEHOLDER') setInsuranceView('LIST'); }} className={`flex flex-col items-center gap-1 ${tab === 'INSURANCE' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">🛡️</span><span className="text-xs font-bold">बीमा</span></button>
            <button onClick={() => { setTab('WALLET'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'WALLET' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">💰</span><span className="text-xs font-bold">वॉलेट</span></button>
            <button onClick={() => { setTab('VOICE'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'VOICE' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">🔊</span><span className="text-xs font-bold">आवाज़</span></button>
            <button onClick={() => { setTab('PROFILE'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'PROFILE' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">👤</span><span className="text-xs font-bold">प्रोफ़ाइल</span></button>
          </div>
        </>
      )}
    </div>
  );
}
