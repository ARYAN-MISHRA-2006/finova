'use client';

import { useState, useEffect } from 'react';
import { setLocalState, getLocalState } from '@/lib/idb';

const ICONS = ['🌾', '🏠', '💧', '🐄', '☀️'];
const PASSWORDS = {
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
  
  // App state
  const [online, setOnline] = useState(true);
  const [activePolicy, setActivePolicy] = useState<any>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Force strict isolation. If no user, stay on login.
    getLocalState('session_userId').then(uid => {
      if (uid) {
        setUserId(uid);
        setScreen('MAIN_APP');
      }
    });

    // Mock policy for the home screen demo as requested
    setActivePolicy({
      name: 'Drought Shield',
      crop: 'मूंगफली',
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
    setScreen('IMAGE_AUTH');
  };

  const handleImageTap = (icon: string) => {
    if (sequence.length < 3) {
      setSequence([...sequence, icon]);
      setAuthError(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedProfile) return;
    const correctSequence = PASSWORDS[selectedProfile];
    if (sequence.join('') === correctSequence.join('')) {
      // ✅ पहचान सफल 
      setUserId(selectedProfile);
      await setLocalState('session_userId', selectedProfile);
      setScreen('MAIN_APP');
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
    // Clear the active session
    await setLocalState('session_userId', null);
    setScreen('LOGIN_PROFILES');
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col font-sans relative">
      
      {/* 1. FARMER LOGIN / PROFILE SELECTION */}
      {screen === 'LOGIN_PROFILES' && (
        <div className="flex-1 p-6 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Select your profile</h1>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify your identity</h2>
          <p className="text-gray-500 mb-8 text-center">Select your pictures in the correct order</p>
          
          <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-[300px]">
            {ICONS.map(icon => (
              <button 
                key={icon} 
                onClick={() => handleImageTap(icon)}
                className="aspect-square bg-white border-2 border-gray-100 rounded-2xl shadow-sm text-4xl flex items-center justify-center hover:bg-gray-50 cursor-pointer active:scale-95 transition-transform"
              >
                {icon}
              </button>
            ))}
          </div>

          <div className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <p className="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wider">Your sequence:</p>
            <div className="flex justify-center gap-4 h-12 items-center text-3xl">
              {sequence.map((icon, idx) => (
                <span key={idx}>{icon}</span>
              ))}
              {sequence.length === 0 && <span className="text-gray-300 text-lg">Empty</span>}
            </div>
          </div>

          {authError && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 font-bold rounded-xl flex items-center w-full justify-center text-lg shadow-sm border border-red-100">
              ❌ गलत क्रम (Wrong Sequence)
            </div>
          )}

          <div className="flex gap-4 w-full">
            <button 
              onClick={handleClear}
              className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-xl cursor-pointer"
            >
              Clear
            </button>
            {authError ? (
              <button 
                onClick={handleClear}
                className="flex-[2] p-4 bg-red-600 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Try Again
              </button>
            ) : (
              <button 
                onClick={handleVerify}
                disabled={sequence.length !== 3}
                className="flex-[2] p-4 bg-green-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:shadow-none cursor-pointer transition-opacity"
              >
                Verify
              </button>
            )}
          </div>
          
          <button onClick={() => setScreen('LOGIN_PROFILES')} className="mt-8 text-gray-500 font-medium">
            ← Back to profiles
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
                    नमस्ते, {userId === 'Ramu' ? 'रामू' : 'सीता'} 👋
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
                          🌾 {activePolicy?.crop || 'मूंगफली'}
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

              {tab === 'PROFILE' && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Profile</h2>
                  <button onClick={handleLogout} className="w-full p-4 bg-red-100 text-red-700 font-bold rounded-2xl">
                    लॉग आउट (Log Out / Handover)
                  </button>
                </div>
              )}
              
              {tab !== 'HOME' && tab !== 'PROFILE' && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="text-4xl mb-4">🚧</span>
                  <p>यह सुविधा जल्द आ रही है</p>
                  <p className="text-sm">(Coming soon in next stage)</p>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM NAVIGATION */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] max-w-md mx-auto">
            <button onClick={() => setTab('HOME')} className={`flex flex-col items-center gap-1 ${tab === 'HOME' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="text-2xl">🏠</span>
              <span className="text-xs font-bold">होम</span>
            </button>
            <button onClick={() => setTab('INSURANCE')} className={`flex flex-col items-center gap-1 ${tab === 'INSURANCE' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="text-2xl">🛡️</span>
              <span className="text-xs font-bold">बीमा</span>
            </button>
            <button onClick={() => setTab('WALLET')} className={`flex flex-col items-center gap-1 ${tab === 'WALLET' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="text-2xl">💰</span>
              <span className="text-xs font-bold">वॉलेट</span>
            </button>
            <button onClick={() => setTab('VOICE')} className={`flex flex-col items-center gap-1 ${tab === 'VOICE' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="text-2xl">🔊</span>
              <span className="text-xs font-bold">आवाज़</span>
            </button>
            <button onClick={() => setTab('PROFILE')} className={`flex flex-col items-center gap-1 ${tab === 'PROFILE' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className="text-2xl">👤</span>
              <span className="text-xs font-bold">प्रोफ़ाइल</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
