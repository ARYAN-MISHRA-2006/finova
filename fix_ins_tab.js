const fs = require('fs');

let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

const oldFallback = /\{tab !== 'HOME' && tab !== 'PROFILE' && \([\s\S]*?Coming soon\)\)<\/p>[\s\S]*?<\/div>[\s\S]*?\)\}/;
const newInsUI = `{tab === 'INSURANCE' && (
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
                                <button onClick={resumeAudio} className="flex-1 p-4 bg-blue-100 text-blue-800 font-bold rounded-2xl cursor-pointer text-sm">▶️ जारी रखें</button>
                              ) : (
                                <button onClick={pauseAudio} className="flex-1 p-4 bg-yellow-100 text-yellow-800 font-bold rounded-2xl cursor-pointer text-sm">⏸️ रोकें</button>
                              )}
                              <button onClick={() => { stopAudio(); speakDescription(selectedProduct.voiceText); }} className="flex-1 p-4 bg-gray-200 text-gray-800 font-bold rounded-2xl cursor-pointer text-sm">🔁 दोबारा सुनें</button>
                              <button onClick={stopAudio} className="flex-1 p-4 bg-red-100 text-red-800 font-bold rounded-2xl cursor-pointer text-sm">⏹️ आगे बढ़ें</button>
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
              
              {tab !== 'HOME' && tab !== 'PROFILE' && tab !== 'INSURANCE' && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="text-4xl mb-4">🚧</span>
                  <p>यह सुविधा जल्द आ रही है (This feature is coming soon)</p>
                </div>
              )}`;
code = code.replace(oldFallback, newInsUI);
fs.writeFileSync('src/app/farmer/page.tsx', code);
