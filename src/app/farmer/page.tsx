'use client';

import { useState, useEffect } from 'react';
import { setLocalState, getLocalState, getBalance, addTransaction, getPendingTransactions, updateTransactionStatus, WalletTransaction, getProducts } from '@/lib/idb';
import { ProductConfig, Policy, bindPolicy, evaluatePolicy, EvaluationRecord } from '@/domain/policy';
import { validateReading, OracleReading } from '@/domain/oracle';

const ICONS = ['🌾', '🏠', '💧', '🐄', '☀️'];
const PASSWORDS: Record<string, string[]> = {
  Ramu: ['🌾', '💧', '🏠'],
  Sita: ['🐄', '☀️', '💧']
};

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
  const [activePolicies, setActivePolicies] = useState<Policy[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductConfig[]>([]);
  
  // Insurance Flow States
  const [insuranceView, setInsuranceView] = useState<'LIST' | 'DETAILS' | 'COMPREHENSION' | 'BINDING_REVIEW' | 'ACTIVE_POLICY'>('LIST');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [compAnswerStatus, setCompAnswerStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [isListeningForAnswer, setIsListeningForAnswer] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [justPurchasedPolicy, setJustPurchasedPolicy] = useState<Policy | null>(null);

  // Wallet
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [spendAmount, setSpendAmount] = useState('');
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    setOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getLocalState('session_userId').then(uid => {
      if (uid === 'Ramu' || uid === 'Sita') {
        setUserId(uid);
        setScreen('MAIN_APP');
        loadPoliciesForUser(uid);
        loadWalletData(uid);
        getProducts().then(setAvailableProducts);
        
        // Demo initial payout logic
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

  useEffect(() => {
    if (effectiveOnline && userId && screen === 'MAIN_APP') {
      syncPendingTransactions(userId);
    }
  }, [effectiveOnline, userId, screen]);

  const loadPoliciesForUser = async (uid: string) => {
    const policies = await getLocalState(`policies_${uid}`) || [];
    setActivePolicies(policies);
  };

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
        await loadPoliciesForUser(selectedProfile);
        await getProducts().then(setAvailableProducts);
        await loadWalletData(selectedProfile);
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
    setActivePolicies([]);
    setAvailableProducts([]);
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
      alert("आवाज़ उपलब्ध नहीं है।");
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

  const startVoiceAnswer = (correctPayout: number) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => setIsListeningForAnswer(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      
      let matchedAmount = 0;
      if (transcript.includes('दस हजार') || transcript.includes('10000')) matchedAmount = 10000;
      else if (transcript.includes('पंद्रह हजार') || transcript.includes('15000')) matchedAmount = 15000;
      else if (transcript.includes('पांच हजार') || transcript.includes('5000')) matchedAmount = 5000;
      else if (transcript.includes('एक हजार') || transcript.includes('1000')) matchedAmount = 1000;

      if (matchedAmount === correctPayout) {
         setCompAnswerStatus('CORRECT');
      } else {
         setCompAnswerStatus('WRONG');
      }
    };
    recognition.onerror = () => {
       alert("हम आपकी आवाज़ समझ नहीं पाए।");
       setIsListeningForAnswer(false);
    };
    recognition.onend = () => setIsListeningForAnswer(false);
    recognition.start();
  };

  const handleBindPolicy = async () => {
    if (!userId || !selectedProduct || isBinding) return;
    setIsBinding(true);

    try {
      const existing = [...activePolicies];
      // Prevent duplicate exact product version
      if (existing.some(p => p.productId === selectedProduct.id && p.productVersion === selectedProduct.version)) {
         alert("Policy already exists for this product version.");
         return;
      }

      const newPolicy = bindPolicy(selectedProduct, userId);
      existing.push(newPolicy);
      
      await setLocalState(`policies_${userId}`, existing);
      setActivePolicies(existing);
      setJustPurchasedPolicy(newPolicy);
      setInsuranceView('ACTIVE_POLICY');
    } finally {
      setIsBinding(false);
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
    
    if (effectiveOnline) {
      syncPendingTransactions(userId);
    }
  };

  // UI Helpers
  const publishedProducts = availableProducts.filter((p: any) => p.status === 'PUBLISHED');
  const activeProductIds = activePolicies.map(p => p.productId);
  const eligibleProducts = publishedProducts.filter(p => !activeProductIds.includes(p.id));

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
          <p className="text-gray-500 mb-8 text-center">अपने चित्रों को सही क्रम में चुनें</p>
          
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
            <button onClick={handleClear} className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-xl cursor-pointer">साफ़ करें</button>
            {authError ? (
              <button onClick={handleClear} className="flex-[2] p-4 bg-red-600 text-white font-bold rounded-xl shadow-md cursor-pointer">फिर से प्रयास करें</button>
            ) : (
              <button onClick={handleVerify} disabled={sequence.length !== 3 || authSuccess} className="flex-[2] p-4 bg-green-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:shadow-none cursor-pointer transition-opacity">सत्यापित करें</button>
            )}
          </div>
          
          <button onClick={() => setScreen('LOGIN_PROFILES')} className="mt-8 text-gray-500 font-medium cursor-pointer">← प्रोफ़ाइल पर वापस जाएं</button>
        </div>
      )}

      {screen === 'MAIN_APP' && (
        <>
          <div className="flex-1 overflow-y-auto pb-24 bg-gray-50">
            {!effectiveOnline && <div className="bg-orange-500 text-white text-center py-2 font-bold text-sm shadow-sm flex items-center justify-center gap-2">📡 ऑफ़लाइन (Offline Mode)</div>}
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">नमस्ते, {userId === 'Ramu' ? 'रामू' : 'सीता'} 👋</h1>
                </div>
                <div className="bg-white p-2 rounded-full shadow-sm">{effectiveOnline ? '📡' : '⚠️'}</div>
              </div>

              {tab === 'HOME' && (
                <div className="space-y-6">
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                    <h2 className="text-xl font-bold text-gray-800">आपके सक्रिय बीमा (Your Active Insurance)</h2>
                  </div>

                  {activePolicies.length === 0 ? (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 text-center">
                      <p className="text-gray-500 mb-4">आपके पास कोई सक्रिय बीमा नहीं है।</p>
                      <button onClick={() => { setTab('INSURANCE'); setInsuranceView('LIST'); }} className="px-6 py-3 bg-green-600 text-white font-bold rounded-2xl shadow-sm cursor-pointer">[+ नया बीमा लें]</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activePolicies.map(policy => {
                        const product = publishedProducts.find(p => p.id === policy.productId);
                        const pName = product ? product.name : policy.productId;
                        return (
                          <div key={policy.policyId} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 opacity-50"></div>
                            
                            <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-4">
                              <h3 className="font-bold text-gray-900 text-lg">{pName}</h3>
                              <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-xs">🟢 सक्रिय</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-gray-500 font-medium">प्रीमियम</span>
                              <span className="font-bold text-gray-800">₹{policy.premium}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-gray-500 font-medium">💰 भुगतान</span>
                              <span className="text-xl font-extrabold text-green-600">₹{policy.payoutAmount.toLocaleString()}</span>
                            </div>
                            <div className="text-xs text-gray-400 text-center mt-4 font-mono">{policy.policyId}</div>
                          </div>
                        );
                      })}
                      
                      <button onClick={() => { setTab('INSURANCE'); setInsuranceView('LIST'); }} className="w-full mt-4 p-4 bg-blue-50 text-blue-700 font-bold rounded-2xl border-2 border-blue-100 hover:bg-blue-100 cursor-pointer text-center">
                        [+ नया बीमा लें] (Get New Insurance)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {tab === 'INSURANCE' && (
                <div className="space-y-6">
                  {insuranceView === 'LIST' && (
                    <>
                      {/* Active Policies Section */}
                      {activePolicies.length > 0 && (
                        <div className="mb-8">
                          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">मेरे सक्रिय बीमा (My Active Insurance)</h2>
                          <div className="space-y-4">
                            {activePolicies.map(policy => {
                              const product = publishedProducts.find(p => p.id === policy.productId);
                              return (
                                <div key={policy.policyId} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
                                  <div>
                                    <h3 className="font-bold text-gray-800">{product ? product.name : policy.productId}</h3>
                                    <p className="text-xs text-gray-500 mt-1">₹{policy.payoutAmount.toLocaleString()} भुगतान</p>
                                  </div>
                                  <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-xs">🟢 सक्रिय</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Available Policies Section */}
                      <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">उपलब्ध बीमा (Available Insurance)</h2>
                        
                        {eligibleProducts.length === 0 ? (
                           <div className="text-gray-500 italic p-4 text-center">फिलहाल कोई नया बीमा उपलब्ध नहीं है।</div>
                        ) : (
                          <div className="space-y-4">
                            {eligibleProducts.map(p => (
                              <div key={p.id} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden">
                                <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-4">
                                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">🌧️</div>
                                  <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                                </div>
                                
                                <div className="space-y-3 mb-6">
                                  <div className="flex justify-between items-center"><span className="text-gray-500">फ़सल</span><span className="font-bold">🌾 {p.crop}</span></div>
                                  <div className="flex justify-between items-center"><span className="text-gray-500">प्रीमियम</span><span className="font-bold text-orange-600">₹{p.premium}</span></div>
                                  <div className="flex justify-between items-center"><span className="text-gray-500">भुगतान</span><span className="font-bold text-green-600">₹{p.payout.toLocaleString()}</span></div>
                                  <div className="flex justify-between items-center"><span className="text-gray-500">अवधि</span><span className="font-bold">{p.coverageDays} दिन</span></div>
                                </div>
                                
                                <button onClick={() => { setSelectedProduct(p); setInsuranceView('DETAILS'); }} className="w-full p-4 bg-green-600 text-white font-bold rounded-2xl cursor-pointer shadow-md">[बीमा लें]</button>
                              </div>
                            ))}
                          </div>
                        )}
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
                          <div className="flex justify-between"><span className="text-gray-500">🌧️ ट्रिगर</span><span className="font-bold text-blue-600">बारिश {selectedProduct.trigger.operator} {selectedProduct.trigger.threshold} mm</span></div>
                          <div className="flex justify-between border-t border-gray-100 pt-4"><span className="text-gray-500">💵 भुगतान</span><span className="font-bold text-green-600 text-xl">₹{selectedProduct.payout.toLocaleString()}</span></div>
                        </div>

                        <div className="mt-8 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900 leading-relaxed font-medium">{(selectedProduct as any).description}</div>

                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🔊 इस बीमा के बारे में सुनें</h3>
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

                  {insuranceView === 'COMPREHENSION' && selectedProduct && (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">पहले समझें (Understand First)</h2>
                        <p className="text-gray-500">बीमा सक्रिय करने से पहले एक सवाल का जवाब दें।</p>
                      </div>

                      <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                        <p className="text-xl font-bold text-gray-800 mb-8 text-center leading-relaxed">
                          "अगर बारिश {selectedProduct.trigger.threshold} mm से {selectedProduct.trigger.operator === '>' ? 'ज्यादा' : 'कम'} हुई तो आपको कितना भुगतान मिलेगा?"
                        </p>

                        {compAnswerStatus === 'IDLE' || compAnswerStatus === 'WRONG' ? (
                          <div className="space-y-4">
                            {/* Determine options based on product payout */}
                            {[1000, 5000, selectedProduct.payout].sort((a,b) => a-b).map((amt, idx) => (
                               <button key={idx} onClick={() => setCompAnswerStatus(amt === selectedProduct.payout ? 'CORRECT' : 'WRONG')} className="w-full p-5 border-2 border-gray-200 rounded-2xl text-xl font-bold text-gray-700 cursor-pointer hover:bg-gray-50">
                                 ₹{amt.toLocaleString()}
                               </button>
                            ))}
                            
                            <div className="relative flex py-5 items-center">
                              <div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 font-bold">या (OR)</span><div className="flex-grow border-t border-gray-200"></div>
                            </div>
                            
                            <button onClick={() => startVoiceAnswer(selectedProduct.payout)} className={`w-full p-5 rounded-2xl text-xl font-bold cursor-pointer transition-all ${isListeningForAnswer ? 'bg-red-100 text-red-600 border-2 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-800 border-2 border-blue-200'}`}>
                              🎤 {isListeningForAnswer ? 'सुन रहा है...' : 'बोलकर जवाब दें'}
                            </button>
                          </div>
                        ) : null}

                        {compAnswerStatus === 'WRONG' && (
                          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                            <div className="text-xl font-bold text-red-700 mb-2">❌ सही नहीं है</div>
                            <p className="text-red-600 mb-4">कृपया फिर से प्रयास करें।</p>
                            <button onClick={() => setInsuranceView('DETAILS')} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl cursor-pointer">🔊 फिर से सुनें</button>
                          </div>
                        )}

                        {compAnswerStatus === 'CORRECT' && (
                          <div className="mt-6 p-6 bg-green-50 border border-green-100 rounded-2xl text-center">
                            <div className="text-2xl font-bold text-green-700 mb-4">✅ सही उत्तर</div>
                            <p className="text-green-800 font-medium mb-6">आपने बीमा की शर्तें समझ ली हैं।</p>
                            <button onClick={() => setInsuranceView('BINDING_REVIEW')} className="w-full p-5 bg-green-600 text-white font-bold text-xl rounded-2xl cursor-pointer shadow-md">[आगे बढ़ें]</button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {insuranceView === 'BINDING_REVIEW' && selectedProduct && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 text-center">
                       <h2 className="text-2xl font-bold text-gray-900 mb-6">पुष्टि करें</h2>
                       
                       <div className="space-y-4 text-lg mb-8">
                          <div className="flex flex-col p-4 bg-gray-50 rounded-2xl">
                             <span className="text-gray-500 mb-1">प्रीमियम</span>
                             <span className="font-bold text-2xl text-orange-600">₹{selectedProduct.premium}</span>
                          </div>
                          <div className="flex flex-col p-4 bg-gray-50 rounded-2xl">
                             <span className="text-gray-500 mb-1">संभावित भुगतान</span>
                             <span className="font-bold text-2xl text-green-600">₹{selectedProduct.payout.toLocaleString()}</span>
                          </div>
                       </div>

                       <button 
                         onClick={handleBindPolicy} 
                         disabled={isBinding}
                         className="w-full p-5 bg-blue-600 text-white font-bold text-xl rounded-2xl cursor-pointer shadow-md disabled:opacity-50"
                       >
                         {isBinding ? 'प्रतीक्षा करें...' : '[बीमा सक्रिय करें]'}
                       </button>
                    </div>
                  )}

                  {insuranceView === 'ACTIVE_POLICY' && justPurchasedPolicy && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-3xl p-6 shadow-md border border-green-200 bg-green-50/30">
                        <div className="text-center mb-6">
                          <div className="text-5xl mb-4">✅</div>
                          <h2 className="text-xl font-bold text-green-800">आपका बीमा सक्रिय हो गया।</h2>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          <div className="font-bold text-lg border-b border-gray-200 pb-2">{publishedProducts.find(p => p.id === justPurchasedPolicy.productId)?.name || justPurchasedPolicy.productId}</div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">फ़सल</span><span className="font-bold">🌾 {justPurchasedPolicy.crop}</span></div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">प्रीमियम</span><span className="font-bold text-orange-600">₹{justPurchasedPolicy.premium}</span></div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">भुगतान</span><span className="font-bold text-green-600">₹{justPurchasedPolicy.payoutAmount.toLocaleString()}</span></div>
                          <div className="flex justify-between items-center"><span className="text-gray-600">अवधि</span><span className="font-bold">30 दिन</span></div>
                        </div>
                        
                        <div className="text-center font-mono text-gray-800 font-bold p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                          {justPurchasedPolicy.policyId}
                        </div>
                        
                        <button onClick={() => { setTab('HOME'); setInsuranceView('LIST'); }} className="w-full mt-6 p-4 bg-gray-900 text-white font-bold rounded-2xl cursor-pointer">
                          होम पर जाएं
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {tab === 'WALLET' && (
                <div className="space-y-6">
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
                    <div className="text-gray-500 font-medium">उपलब्ध राशि</div>
                    
                    {!effectiveOnline && (
                      <div className="mt-4 text-orange-500 font-bold flex items-center justify-center gap-2">
                        📡 ऑफ़लाइन (Offline Mode)
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 text-lg">पैसे खर्च करें</h3>
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
                                  <span className="text-xs font-bold text-orange-500">⏳ Pending</span>
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

              {tab !== 'HOME' && tab !== 'PROFILE' && tab !== 'INSURANCE' && tab !== 'WALLET' && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="text-4xl mb-4">🚧</span>
                  <p>यह सुविधा जल्द आ रही है</p>
                </div>
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] max-w-md mx-auto">
            <button onClick={() => { setTab('HOME'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'HOME' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">🏠</span><span className="text-xs font-bold">होम</span></button>
            <button onClick={() => { setTab('INSURANCE'); stopAudio(); setInsuranceView('LIST'); }} className={`flex flex-col items-center gap-1 ${tab === 'INSURANCE' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">🛡️</span><span className="text-xs font-bold">बीमा</span></button>
            <button onClick={() => { setTab('WALLET'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'WALLET' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">💰</span><span className="text-xs font-bold">वॉलेट</span></button>
            <button onClick={() => { setTab('VOICE'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'VOICE' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">🔊</span><span className="text-xs font-bold">आवाज़</span></button>
            <button onClick={() => { setTab('PROFILE'); stopAudio(); }} className={`flex flex-col items-center gap-1 ${tab === 'PROFILE' ? 'text-green-600' : 'text-gray-400'}`}><span className="text-2xl">👤</span><span className="text-xs font-bold">प्रोफ़ाइल</span></button>
          </div>
        </>
      )}
    </div>
  );
}
