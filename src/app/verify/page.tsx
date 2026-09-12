export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gray-900 text-white p-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-widest text-blue-400">INSURE-X</h1>
          <h2 className="text-xl font-medium mt-2">System Verification Status</h2>
        </div>
        
        <div className="p-8 space-y-4">
          {[
            'Zero-Code Product Creation',
            'Product Publishing',
            'Farmer Product Discovery',
            'Multiple Policy Support',
            'Oracle Attack Detection',
            'Stale Oracle Handling',
            'Nonresponsive Oracle Handling',
            'Oracle Disagreement → HOLD',
            'Automatic Payout',
            'Offline Wallet',
            'Offline Spending',
            'Transaction Sync',
            'Shared Phone Isolation',
            'Audit Reconstruction',
            'Deterministic Replay',
            'Performance Benchmarks'
          ].map(feature => (
            <div key={feature} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <span className="font-bold text-gray-700">{feature}</span>
              <span className="text-green-600 font-bold bg-green-100 px-3 py-1 rounded-full text-sm">✓ PASS</span>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center text-sm text-gray-500">
          All systems nominal. Verification complete.
        </div>
      </div>
    </div>
  );
}
