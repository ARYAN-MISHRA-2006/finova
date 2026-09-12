'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function InsurerApp() {
  const [tab, setTab] = useState('DASHBOARD');
  const [products, setProducts] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [showQR, setShowQR] = useState<string | null>(null);

  // Create product form state
  const [newProduct, setNewProduct] = useState({
    productId: '', name: '', crop: '', periodDays: 30,
    trigger: { metric: 'rainfall', operator: '<', threshold: 100, unit: 'mm' },
    payout: { amount: 10000, currency: 'INR' },
    aggregation: 'median', disagreement: 'HOLD'
  });

  useEffect(() => {
    fetch('/api/products').then(res => res.json()).then(setProducts).catch(console.error);
    fetch('/api/audit').then(res => res.json()).then(data => setAudits(data.logs)).catch(console.error);
  }, [tab]);

  const handleCreateProduct = async () => {
    await fetch('/api/products/create', { method: 'POST', body: JSON.stringify(newProduct) });
    alert('Product created');
    setTab('DASHBOARD');
  };

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans bg-gray-50 min-h-screen text-gray-900">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">Insure-X / Finova Operator</h1>
        <div className="flex gap-4">
          <button onClick={() => setTab('DASHBOARD')} className={`px-4 py-2 rounded ${tab === 'DASHBOARD' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>Dashboard</button>
          <button onClick={() => setTab('PRODUCTS')} className={`px-4 py-2 rounded ${tab === 'PRODUCTS' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>Products</button>
          <button onClick={() => setTab('CREATE_PRODUCT')} className={`px-4 py-2 rounded ${tab === 'CREATE_PRODUCT' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>+ Create Product</button>
          <button onClick={() => setTab('AUDIT')} className={`px-4 py-2 rounded ${tab === 'AUDIT' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}>Claims & Audit</button>
        </div>
      </div>

      {tab === 'DASHBOARD' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="p-6 bg-white border rounded shadow">
            <h3 className="text-gray-500">Total Products</h3>
            <div className="text-3xl font-bold">{products.length}</div>
          </div>
          <div className="p-6 bg-white border rounded shadow">
            <h3 className="text-gray-500">Audit Logs / Decisions</h3>
            <div className="text-3xl font-bold">{audits.length}</div>
          </div>
        </div>
      )}

      {tab === 'PRODUCTS' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Configured Products (Policy-as-Data)</h2>
          {products.map(p => (
            <div key={p.productId} className="p-4 border bg-white rounded shadow flex justify-between">
              <div>
                <h3 className="font-bold text-lg">{p.name}</h3>
                <div className="text-sm text-gray-600">Crop: {p.crop} | Period: {p.periodDays} days</div>
                <div className="text-sm font-mono bg-gray-100 p-2 mt-2 rounded">
                  Trigger: {p.trigger.metric} {p.trigger.operator} {p.trigger.threshold}{p.trigger.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">Payout: ₹{p.payout.amount}</div>
                <div className="text-xs text-gray-500 mt-2">Aggr: {p.aggregation} | Disagreement: {p.disagreement}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'CREATE_PRODUCT' && (
        <div className="bg-white p-6 border rounded shadow space-y-4">
          <h2 className="text-2xl font-bold mb-4">Create New Product</h2>
          <input className="w-full border p-2 rounded" placeholder="Product ID (e.g. drought_shield)" onChange={e => setNewProduct({...newProduct, productId: e.target.value})} />
          <input className="w-full border p-2 rounded" placeholder="Product Name" onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
          <input className="w-full border p-2 rounded" placeholder="Crop" onChange={e => setNewProduct({...newProduct, crop: e.target.value})} />
          <input type="number" className="w-full border p-2 rounded" placeholder="Threshold (mm)" onChange={e => setNewProduct({...newProduct, trigger: {...newProduct.trigger, threshold: Number(e.target.value)}})} />
          <input type="number" className="w-full border p-2 rounded" placeholder="Payout (INR)" onChange={e => setNewProduct({...newProduct, payout: {...newProduct.payout, amount: Number(e.target.value)}})} />
          <button onClick={handleCreateProduct} className="bg-blue-600 text-white px-4 py-2 rounded">Save Policy Data</button>
        </div>
      )}

      {tab === 'AUDIT' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold mb-4">Decision Explanation & Audit</h2>
          {audits.map((log: any) => {
            const details = JSON.parse(log.details);
            return (
              <div key={log.id} className="p-4 border bg-white rounded shadow text-sm space-y-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-bold text-gray-700">Claim ID: <span className="font-mono">{log.id}</span></span>
                  <span className={`px-2 py-1 rounded font-bold ${log.event_type === 'POLICY_EVALUATED' && details.decision?.triggered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{log.event_type}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold mb-1">Weather Trust</h4>
                    <div>Status: <b>{details.trustResult?.status}</b></div>
                    <div>Trusted Value: <b>{details.trustResult?.trustedValue ?? 'N/A'} mm</b></div>
                    <div className="mt-2 text-xs">
                      <div><b>Valid Sources:</b> {details.trustResult?.validSources.map((s:any) => `${s.source}(${s.value})`).join(', ')}</div>
                      {details.trustResult?.outliers?.length > 0 && (
                        <div className="text-red-500"><b>Outliers:</b> {details.trustResult?.outliers.map((s:any) => `${s.source}(${s.value})`).join(', ')}</div>
                      )}
                    </div>
                  </div>
                  
                  {details.decision && (
                    <div>
                      <h4 className="font-bold mb-1">Policy Decision</h4>
                      <div>Triggered: <b>{details.decision.triggered ? 'YES' : 'NO'}</b></div>
                      <div>Reason: {details.decision.reason}</div>
                      {details.decision.triggered && (
                        <div className="mt-2 text-green-600 font-bold">Payout: ₹{details.payout}</div>
                      )}
                      
                      {details.criticalRecord && (
                        <div className="mt-4">
                          <button 
                            onClick={() => setShowQR(showQR === log.id ? null : log.id)} 
                            className="bg-gray-800 text-white px-4 py-2 rounded"
                          >
                            {showQR === log.id ? 'Hide QR' : 'Generate Settlement QR'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {showQR === log.id && details.criticalRecord && (
                  <div className="mt-4 p-4 border-2 border-dashed bg-gray-50 flex flex-col items-center justify-center">
                    <h3 className="font-bold text-lg mb-2 text-center">FINOVA OFFLINE SETTLEMENT</h3>
                    <div className="text-center mb-4">
                      <p>Policy: <b>{details.policy}</b></p>
                      <p>Settlement: <b>₹{details.payout}</b></p>
                      <p>Record: <b>64 bytes</b></p>
                      <p className="text-green-600 font-bold mt-2">READY FOR OFFLINE HANDOFF</p>
                    </div>
                    <div className="bg-white p-4 inline-block shadow">
                      <QRCodeSVG value={details.criticalRecord} size={256} />
                    </div>
                    <div className="mt-4 text-xs text-gray-500 font-mono break-all max-w-lg text-center">
                      <b>Base64 Payload:</b><br/>{details.criticalRecord}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
