const fs = require('fs');
let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

const walletBlock = `              {tab === 'WALLET' && (
                <div className="space-y-6">
                  {/* Offline / Dev Simulator Header */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-100 p-4 rounded-2xl flex items-center justify-between border border-gray-200">
                       <span className="font-bold text-gray-700 text-sm">Network Simulator (Dev Only)</span>
                       <button 
                         onClick={() => setSimulatedOffline(!simulatedOffline)}
                         className={\`px-4 py-2 rounded-xl font-bold text-sm \${simulatedOffline ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}\`}
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
                                <span className={\`font-bold text-lg \${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}\`}>
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
`;

code = code.replace(/\{tab === 'PROFILE' && \(/, walletBlock + "\n\n              {tab === 'PROFILE' && (");

fs.writeFileSync('src/app/farmer/page.tsx', code);
