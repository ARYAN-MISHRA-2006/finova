const fs = require('fs');

const code = `'use client';

import { useState, useEffect } from 'react';
import { setLocalState, getLocalState } from '@/lib/idb';

const ICONS = ['🌾', '🏠', '💧', '🐄', '☀️'];
const PASSWORDS = {
  Ramu: ['🌾', '💧', '🏠'],
  Sita: ['🐄', '☀️', '💧']
};

const AVAILABLE_PRODUCTS = [
  {
    id: "drought-shield-v1",
    name: "Drought Shield",
    crop: "मूंगफली (Groundnut)",
    premium: 250,
    payout: 10000,
    duration: "30 दिन (30 Days)",
    trigger: "बारिश < 100 mm",
    description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 100 mm से कम रहती है, तो आपको ₹10,000 का भुगतान मिलेगा।",
    voiceText: "यह सूखे से बचाव का बीमा है। यदि बीमा अवधि के दौरान आपके क्षेत्र में बारिश तय सीमा से कम रहती है, तो आपको दस हजार रुपये का भुगतान मिलेगा। इस बीमा की कीमत दो सौ पचास रुपये है और इसकी अवधि तीस दिन है।",
    status: "PUBLISHED"
  },
  {
    id: "flood-protect-v1",
    name: "Flood Protect",
    crop: "धान (Paddy)",
    premium: 300,
    payout: 15000,
    duration: "60 दिन (60 Days)",
    trigger: "बारिश > 300 mm",
    description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 300 mm से अधिक होती है, तो आपको ₹15,000 का भुगतान मिलेगा।",
    voiceText: "",
    status: "DRAFT"
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
  const [activePolicy, setActivePolicy] = useState<any>(null);
  
  // Insurance Flow States
  const [insuranceView, setInsuranceView] = useState<'LIST' | 'DETAILS' | 'COMPREHENSION' | 'BINDING_PLACEHOLDER'>('LIST');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [compAnswerStatus, setCompAnswerStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [isListeningForAnswer, setIsListeningForAnswer] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Force strict isolation. If no user, stay on login.
    getLocalState('session_userId').then(uid => {
      if (uid === 'Ramu' || uid === 'Sita') {
        setUserId(uid);
        setScreen('MAIN_APP');
      } else if (uid) {
        // Clear invalid old session state from previous iterations
        setLocalState('session_userId', null);
      }
    });

    // Mock policy for the home screen demo as requested
    setActivePolicy({
      name: 'Drought Shield',
      crop: 'मूंगफली (Groundnut)',
      payout: { amount: 10000 }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    // Strict isolation: clear everything
    setUserId(null);
    setSelectedProfile(null);
    setSequence([]);
    setTab('HOME');
    setAuthSuccess(false);
    // Clear the active session
    await setLocalState('session_userId', null);
    setScreen('LOGIN_PROFILES');
  };

  // Audio Handlers
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

  // Voice Recognition Handler
  const startVoiceAnswer = () => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans relative">
      
      {/* 1. FARMER LOGIN / PROFILE SELECTION */}
      {screen === 'LOGIN_PROFILES' && (
        <div className="flex-1 p-6 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">अपनी प्रोफ़ाइल चुनें (Select your profile)</h1>
          <div className="space-y-6">
            <button 
              onClick={() => handleProfileSelect('Ramu')}
              className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl shadow-sm flex items-center cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mr-4">🌾</div>
              <span className="text-2xl font-bold text-gray-800">Ramu</span>
            </button>
            <button 
              onClick={() => handleProfileSelect('Sita')}
              className="w-full p-6 bg-white border-2 border-gray-100 rounded-3xl shadow-sm flex items-center cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl mr-4">🐄</div>
              <span className="text-2xl font-bold text-gray-800">Sita</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. IMAGE AUTHENTICATION */}
      {screen === 'IMAGE_AUTH' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">अपनी पहचान सत्यापित करें (Verify your identity)</h2>
          <p className="text-gray-500 mb-8 text-center">अपने चित्रों को सही क्रम में चुनें (Select your pictures in the correct order)</p>
          
          <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-[300px]">
            {ICONS.map(icon => (
              <button 
                key={icon} 
                onClick={() => handleImageTap(icon)}
                className={\`aspect-square border-2 rounded-2xl shadow-sm text-4xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform \${sequence.includes(icon) ? 'ring-4 ring-blue-500 bg-blue-50 border-blue-500' : 'bg-white border-gray-100 hover:bg-gray-50'}\`}
              >
                {icon}
              </button>
            ))}
          </div>

          <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <p className="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wider">आपका क्रम (Your sequence):</p>
            <div className="flex justify-center gap-4 h-12 items-center text-3xl">
              {sequence.map((icon, idx) => (
                <span key={idx}>{icon}</span>
              ))}
              {sequence.length === 0 && <span className="text-gray-300 text-lg">खाली (Empty)</span>}
            </div>
          </div>

          <div className="h-16 w-full flex items-center justify-center mb-6">
            {authError && (
              <div className="p-4 bg-red-50 text-red-700 font-bold rounded-xl flex items-center w-full justify-center text-lg shadow-sm border border-red-100 h-full">
                ❌ गलत क्रम (Wrong Sequence)
              </div>
            )}
            {authSuccess && (
              <div className="p-4 bg-green-50 text-green-700 font-bold rounded-xl flex items-center w-full justify-center text-lg shadow-sm border border-green-100 h-full">
                ✅ पहचान सफल
              </div>
            )}
          </div>

          <div className="flex gap-4 w-full">
            <button 
              onClick={handleClear}
              className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-xl cursor-pointer"
            >
              साफ़ करें (Clear)
            </button>
            {authError ? (
              <button 
                onClick={handleClear}
                className="flex-[2] p-4 bg-red-600 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                फिर से प्रयास करें (Try Again)
              </button>
            ) : (
              <button 
                onClick={handleVerify}
                disabled={sequence.length !== 3 || authSuccess}
                className="flex-[2] p-4 bg-green-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:shadow-none cursor-pointer transition-opacity"
              >
                सत्यापित करें (Verify)
              </button>
            )}
          </div>
          
          <button onClick={() => setScreen('LOGIN_PROFILES')} className="mt-8 text-gray-500 font-medium cursor-pointer">
            ← प्रोफ़ाइल पर वापस जाएं (Back to profiles)
          </button>
        </div>
      )}

      {/* 3. FARMER HOME SCREEN */}
      {screen === 'MAIN_APP' && (
        <>
          <div className="flex-1 overflow-y-auto pb-24 bg-gray-50">
            {/* Network Banner */}
            {!online && (
              <div className="bg-orange-500 text-white text-center py-2 font-bold text-sm shadow-sm flex items-center justify-center gap-2">
                📡 ऑफ़लाइन (Offline Mode)
              </div>
            )}
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">
                    नमस्ते, {userId === 'Ramu' ? 'रामू' : 'सीता'} 👋 (Hello)
                  </h1>
                </div>
                <div className="bg-white p-2 rounded-full shadow-sm">
                  {online ? '📡' : '⚠️'}
                </div>
              </div>

              {tab === 'HOME' && (
                <div className="space-y-6">
                  {/* Insurance Status Card */}
                  <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 opacity-50"></div>
                    
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                        🛡️
                      </div>
                      <h2 className="text-xl font-bold text-gray-800">आपका बीमा</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <span className="text-gray-500 font-medium">स्थिति (Status)</span>
                        <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                          सक्रिय (Active)
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <span className="text-gray-500 font-medium">फ़सल (Crop)</span>
                        <span className="font-bold text-gray-800 flex items-center gap-2">
                          🌾 {activePolicy?.crop || 'मूंगफली (Groundnut)'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                        <span className="text-gray-500 font-medium">प्लान (Plan)</span>
                        <span className="font-bold text-gray-800">
                          {activePolicy?.name || 'Drought Shield'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-gray-500 font-medium">💰 भुगतान (Payout)</span>
                        <span className="text-2xl font-extrabold text-green-600">
                          ₹{activePolicy?.payout?.amount?.toLocaleString() || '10,000'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Placeholder for future features */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center justify-center text-center gap-2 h-32">
                      <span className="text-3xl">🌤️</span>
                      <span className="font-bold text-blue-900">मौसम (Weather)</span>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex flex-col items-center justify-center text-center gap-2 h-32">
                      <span className="text-3xl">📝</span>
                      <span className="font-bold text-purple-900">दावा (Claim)</span>
                    </div>
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
                        {AVAILABLE_PRODUCTS.filter(p => p.status === 'PUBLISHED').map(p => (
                          <div key={p.id} className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 relative overflow-hidden">
                            <div className="flex items-center gap-3 mb-4 border-b border-gray-50 pb-4">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                              <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                              <div className="flex justify-between items-center"><span className="text-gray-500">फ़सल (Crop)</span><span className="font-bold">🌾 {p.crop}</span></div>
                              <div className="flex justify-between items-center"><span className="text-gray-500">प्रीमियम (Premium)</span><span className="font-bold text-orange-600">₹{p.premium}</span></div>
                              <div className="flex justify-between items-center"><span className="text-gray-500">भुगतान (Payout)</span><span className="font-bold text-green-600">₹{p.payout.toLocaleString()}</span></div>
                              <div className="flex justify-between items-center"><span className="text-gray-500">अवधि (Duration)</span><span className="font-bold">{p.duration}</span></div>
                            </div>
                            
                            <button 
                              onClick={() => { setSelectedProduct(p); setInsuranceView('DETAILS'); }}
                              className="w-full p-4 bg-green-600 text-white font-bold rounded-2xl cursor-pointer"
                            >
                              विवरण देखें (View Details)
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {insuranceView === 'DETAILS' && selectedProduct && (
                    <>
                      <button onClick={() => { setInsuranceView('LIST'); stopAudio(); }} className="text-gray-500 font-medium mb-4 flex items-center gap-2 cursor-pointer">
                        ← वापस (Back)
                      </button>
                      <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                        <div className="flex items-center gap-3 mb-6 border-b border-gray-50 pb-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">🛡️</div>
                          <h2 className="text-2xl font-bold text-gray-800">{selectedProduct.name}</h2>
                        </div>

                        <div className="space-y-4 text-lg">
                          <div className="flex justify-between"><span className="text-gray-500">🌾 फसल</span><span className="font-bold">{selectedProduct.crop}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">💰 प्रीमियम</span><span className="font-bold text-orange-600">₹{selectedProduct.premium}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">📅 अवधि</span><span className="font-bold">{selectedProduct.duration}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">🌧️ ट्रिगर</span><span className="font-bold">{selectedProduct.trigger}</span></div>
                          <div className="flex justify-between border-t border-gray-100 pt-4"><span className="text-gray-500">💵 भुगतान</span><span className="font-bold text-green-600 text-xl">₹{selectedProduct.payout.toLocaleString()}</span></div>
                        </div>

                        <div className="mt-8 bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900 leading-relaxed font-medium">
                          {selectedProduct.description}
                        </div>

                        <div className="mt-6 border-t border-gray-100 pt-6">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">🔊 इस बीमा के बारे में सुनें (Listen)</h3>
                          {!isPlayingAudio ? (
                            <button onClick={() => speakDescription(selectedProduct.voiceText)} className="w-full p-4 bg-gray-100 text-gray-800 font-bold rounded-2xl flex items-center justify-center gap-2 cursor-pointer">
                              🔊 सुनें (Listen)
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              {isAudioPaused ? (
                                <button onClick={resumeAudio} className="flex-1 p-4 bg-blue-100 text-blue-800 font-bold rounded-2xl cursor-pointer text-sm">▶️ जारी रखें (Resume)</button>
                              ) : (
                                <button onClick={pauseAudio} className="flex-1 p-4 bg-yellow-100 text-yellow-800 font-bold rounded-2xl cursor-pointer text-sm">⏸️ रोकें (Pause)</button>
                              )}
                              <button onClick={() => { stopAudio(); speakDescription(selectedProduct.voiceText); }} className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-2xl cursor-pointer text-sm">🔁 दोबारा (Replay)</button>
                              <button onClick={stopAudio} className="flex-1 p-4 bg-red-100 text-red-800 font-bold rounded-2xl cursor-pointer text-sm">⏹️ बंद (Stop)</button>
                            </div>
                          )}
                        </div>

                        <div className="mt-8 pt-4">
                          <button 
                            onClick={() => { stopAudio(); setInsuranceView('COMPREHENSION'); setCompAnswerStatus('IDLE'); }} 
                            className="w-full p-5 bg-green-600 text-white font-bold text-xl rounded-2xl shadow-lg cursor-pointer"
                          >
                            [बीमा लें] (Buy Insurance)
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {insuranceView === 'COMPREHENSION' && (
                    <>
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">पहले समझें (Understand First)</h2>
                        <p className="text-gray-500">बीमा लेने से पहले एक सवाल का जवाब दें। (Answer a question before buying.)</p>
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
                              <div className="flex-grow border-t border-gray-200"></div>
                              <span className="flex-shrink-0 mx-4 text-gray-400 font-bold">या (OR)</span>
                              <div className="flex-grow border-t border-gray-200"></div>
                            </div>
                            
                            <button onClick={startVoiceAnswer} className={\`w-full p-5 rounded-2xl text-xl font-bold cursor-pointer transition-all \${isListeningForAnswer ? 'bg-red-100 text-red-600 border-2 border-red-200 animate-pulse' : 'bg-blue-50 text-blue-800 border-2 border-blue-200'}\`}>
                              🎤 {isListeningForAnswer ? 'सुन रहा है... (Listening...)' : 'बोलकर जवाब दें (Answer by Voice)'}
                            </button>
                          </div>
                        ) : null}

                        {compAnswerStatus === 'WRONG' && (
                          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-center">
                            <div className="text-xl font-bold text-red-700 mb-2">❌ सही नहीं है (Incorrect)</div>
                            <p className="text-red-600 mb-4">कृपया फिर से प्रयास करें। (Please try again.)</p>
                            <button onClick={() => setInsuranceView('DETAILS')} className="px-6 py-3 bg-gray-800 text-white font-bold rounded-xl cursor-pointer">
                              🔊 फिर से सुनें (Listen Again)
                            </button>
                          </div>
                        )}

                        {compAnswerStatus === 'CORRECT' && (
                          <div className="mt-6 p-6 bg-green-50 border border-green-100 rounded-2xl text-center">
                            <div className="text-2xl font-bold text-green-700 mb-4">✅ सही उत्तर (Correct)</div>
                            <p className="text-green-800 font-medium mb-6">आपने बीमा की मुख्य शर्त समझ ली है। (You have understood the main condition of the insurance.)</p>
                            <button onClick={() => setInsuranceView('BINDING_PLACEHOLDER')} className="w-full p-5 bg-green-600 text-white font-bold text-xl rounded-2xl cursor-pointer shadow-md">
                              [आगे बढ़ें] (Continue)
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {insuranceView === 'BINDING_PLACEHOLDER' && (
                    <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 text-center flex flex-col items-center justify-center min-h-[300px]">
                      <div className="text-5xl mb-6">🚀</div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Policy Binding</h2>
                      <p className="text-gray-500 mb-8">Coming in next implementation step.</p>
                      <button onClick={() => setInsuranceView('LIST')} className="px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl cursor-pointer">
                        वापस जाएँ (Go Back)
                      </button>
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
              
              {tab !== 'HOME' && tab !== 'PROFILE' && tab !== 'INSURANCE' && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="text-4xl mb-4">🚧</span>
                  <p>यह सुविधा जल्द आ रही है (This feature is coming soon)</p>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM NAVIGATION */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] max-w-md mx-auto">
            <button onClick={() => { setTab('HOME'); stopAudio(); }} className={\`flex flex-col items-center gap-1 \${tab === 'HOME' ? 'text-green-600' : 'text-gray-400'}\`}>
              <span className="text-2xl">🏠</span>
              <span className="text-xs font-bold">होम (Home)</span>
            </button>
            <button onClick={() => { setTab('INSURANCE'); stopAudio(); if(insuranceView === 'BINDING_PLACEHOLDER') setInsuranceView('LIST'); }} className={\`flex flex-col items-center gap-1 \${tab === 'INSURANCE' ? 'text-green-600' : 'text-gray-400'}\`}>
              <span className="text-2xl">🛡️</span>
              <span className="text-xs font-bold">बीमा (Insurance)</span>
            </button>
            <button onClick={() => { setTab('WALLET'); stopAudio(); }} className={\`flex flex-col items-center gap-1 \${tab === 'WALLET' ? 'text-green-600' : 'text-gray-400'}\`}>
              <span className="text-2xl">💰</span>
              <span className="text-xs font-bold">वॉलेट (Wallet)</span>
            </button>
            <button onClick={() => { setTab('VOICE'); stopAudio(); }} className={\`flex flex-col items-center gap-1 \${tab === 'VOICE' ? 'text-green-600' : 'text-gray-400'}\`}>
              <span className="text-2xl">🔊</span>
              <span className="text-xs font-bold">आवाज़ (Voice)</span>
            </button>
            <button onClick={() => { setTab('PROFILE'); stopAudio(); }} className={\`flex flex-col items-center gap-1 \${tab === 'PROFILE' ? 'text-green-600' : 'text-gray-400'}\`}>
              <span className="text-2xl">👤</span>
              <span className="text-xs font-bold">प्रोफ़ाइल (Profile)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/app/farmer/page.tsx', code);
