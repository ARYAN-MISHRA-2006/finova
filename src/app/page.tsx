'use client';

import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';

export default function AppOpening() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-gray-900 font-sans p-6">
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white mb-6 shadow-xl">
          <Shield size={48} />
        </div>
        <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight mb-2">INSURE-X</h1>
        <p className="text-lg text-blue-700 font-medium max-w-[280px]">
          Insurance that works when the network doesn't.
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl mb-8">
        <h2 className="text-2xl font-bold text-center mb-6">आप कौन हैं? (Who are you?)</h2>
        <div className="space-y-4">
          
          <button 
            onClick={() => router.push('/farmer')}
            className="w-full p-5 bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-2xl flex items-center shadow-sm cursor-pointer transition-colors"
          >
            <span className="text-4xl mr-4">🌾</span>
            <span className="text-xl font-bold text-green-900">किसान (Farmer)</span>
          </button>
          
          <button 
            onClick={() => router.push('/merchant')}
            className="w-full p-5 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-2xl flex items-center shadow-sm cursor-pointer transition-colors"
          >
            <span className="text-4xl mr-4">🏪</span>
            <span className="text-xl font-bold text-orange-900">बीज विक्रेता (Seed Seller)</span>
          </button>

          
          <button 
            onClick={() => router.push('/insurer')}
            className="w-full p-5 bg-gray-50 border-2 border-gray-200 rounded-2xl flex items-center cursor-pointer transition-colors opacity-70"
          >
            <span className="text-4xl mr-4">🏦</span>
            <div className="text-left">
              <span className="text-xl font-bold text-gray-700 block">बीमाकर्ता (Insurer)</span>
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">डेस्कटॉप पोर्टल (Desktop Portal)</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
