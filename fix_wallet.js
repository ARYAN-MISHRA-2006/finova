const fs = require('fs');

let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

// 1. Add updateTransactionStatus import
code = code.replace(/import \{ setLocalState, getLocalState \} from '@\/lib\/idb';/, "import { setLocalState, getLocalState, getBalance, addTransaction, getPendingTransactions, updateTransactionStatus, WalletTransaction } from '@/lib/idb';");

// 2. Add Wallet states
const stateRegex = /const \[activePolicy, setActivePolicy\] = useState<Policy \| null>\(null\);/;
const newState = `const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [spendAmount, setSpendAmount] = useState('');
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
`;
code = code.replace(stateRegex, newState);

// 3. Update network listener to respect simulatedOffline and trigger sync
const useEffectRegex = /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/;
const newUseEffect = `useEffect(() => {
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
                 id: \`TX-\${Math.random().toString(36).substr(2, 9).toUpperCase()}\`,
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
      id: \`TX-\${Math.random().toString(36).substr(2, 9).toUpperCase()}\`,
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
`;
code = code.replace(useEffectRegex, newUseEffect);

// 4. Update the fallback network indicator at the top of MAIN_APP to use effectiveOnline
code = code.replace(/\{!online && \(/g, "{!effectiveOnline && (");
code = code.replace(/\{online \? '📡' : '⚠️'\}/g, "{effectiveOnline ? '📡' : '⚠️'}");

// 5. Update Wallet UI
const walletUIRegex = /\{tab === 'WALLET' && \([\s\S]*?\}\)/;
const newWalletUI = `{tab === 'WALLET' && (
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
                         disabled={!spendAmount || parseInt(spendAmount) > balance}
                         className="px-6 bg-blue-600 text-white font-bold rounded-2xl shadow-md disabled:opacity-50"
                       >
                         Spend
                       </button>
                    </div>
                  </div>

                  {transactions.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 text-lg">हाल के लेन-देन (Recent Transactions)</h3>
                        {isSyncing && <span className="text-blue-500 text-sm font-bold animate-pulse">Syncing...</span>}
                      </div>
                      <div className="space-y-3">
                         {transactions.map(tx => (
                           <div key={tx.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{tx.id}</span>
                                <span className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-xl text-red-600">₹{Math.abs(tx.amount).toLocaleString()}</span>
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
              )}`;

// Wait, the previous dummy code for Wallet was:
/*
              {tab === 'WALLET' && (
                <div className="space-y-6">
                  {/* something * /
                </div>
              )}
*/
// Actually I didn't even have a WALLET block, I had:
// {tab !== 'HOME' && tab !== 'PROFILE' && tab !== 'INSURANCE' && ( <div ...>Coming soon</div> )}
// Let's replace the Coming soon block to explicitly ignore WALLET.
const comingSoonRegex = /\{tab !== 'HOME' && tab !== 'PROFILE' && tab !== 'INSURANCE' && \([\s\S]*?\}\)/;
code = code.replace(comingSoonRegex, `${newWalletUI}\n\n              {tab !== 'HOME' && tab !== 'PROFILE' && tab !== 'INSURANCE' && tab !== 'WALLET' && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="text-4xl mb-4">🚧</span>
                  <p>यह सुविधा जल्द आ रही है (This feature is coming soon)</p>
                </div>
              )}`);

fs.writeFileSync('src/app/farmer/page.tsx', code);
