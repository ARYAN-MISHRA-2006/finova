"use client";

import { useState, useEffect } from "react";
import { getProducts, saveProduct } from "@/lib/idb";
import {
  ProductConfig,
  evaluatePolicy,
  EvaluationRecord,
  bindPolicy,
} from "@/domain/policy";
import { validateReading, OracleReading } from "@/domain/oracle";

export default function InsurerApp() {
  const [tab, setTab] = useState<"DASHBOARD" | "PRODUCTS" | "ORACLE">(
    "DASHBOARD",
  );
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const [view, setView] = useState<"LIST" | "CREATE">("LIST");

  // Product Form State
  const [form, setForm] = useState({
    name: "Excess Rain Shield",
    crop: "groundnut",
    index: "rainfall",
    operator: ">",
    threshold: 250,
    payout: 15000,
    premium: 300,
    coverageDays: 30,
    requiredSources: 3,
    minimumValidSources: 2,
    aggregation: "median",
    maxSourceAgeMinutes: 60,
    maxDisagreement: 20,
    onDisagreement: "HOLD",
  });

  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);

  // Oracle Test State
  const [oracleTest, setOracleTest] = useState({ A: 72, B: 74, C: 4 });
  const [cState, setCState] = useState<"NORMAL" | "STALE" | "TIMEOUT">(
    "NORMAL",
  );
  const [testEval, setTestEval] = useState<EvaluationRecord | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const p = await getProducts();
    setProducts(p);
  };

  const handleValidate = () => {
    if (
      !form.name ||
      form.premium <= 0 ||
      form.payout <= 0 ||
      form.coverageDays <= 0 ||
      form.threshold <= 0
    ) {
      setValidationResult(
        "❌ Product configuration is invalid. Check numerical fields.",
      );
      setIsValidated(false);
      return;
    }
    if (form.requiredSources < form.minimumValidSources) {
      setValidationResult(
        "❌ Required sources cannot be less than minimum valid sources.",
      );
      setIsValidated(false);
      return;
    }

    setValidationResult("✅ Product is valid.");
    setIsValidated(true);
  };

  const handlePublish = async () => {
    if (!isValidated) return;
    const newProduct: ProductConfig = {
      id: form.name.toLowerCase().replace(/\\s+/g, "-"),
      version: 1,
      name: form.name,
      crop: form.crop,
      premium: form.premium,
      payout: form.payout,
      coverageDays: form.coverageDays,
      trigger: {
        index: form.index,
        operator: form.operator as any,
        threshold: form.threshold,
        periodDays: form.coverageDays,
        aggregation: form.aggregation as "median" | "average",
      },
      oracleConfig: {
        requiredSources: form.requiredSources,
        minimumValidSources: form.minimumValidSources,
        maxSourceAgeMs: form.maxSourceAgeMinutes * 60 * 1000,
        maxDisagreementTolerance: form.maxDisagreement,
      },
      ...({
        description: `अगर बीमा अवधि के दौरान बारिश \${form.threshold} mm \${form.operator === '>' ? 'से अधिक' : 'से कम'} रहती है, तो आपको ₹\${form.payout} का भुगतान मिलेगा।`,
        voiceText: `यह \${form.name} है। यदि बारिश \${form.threshold} mm \${form.operator === '>' ? 'से अधिक' : 'से कम'} होती है, तो आपको \${form.payout} रुपये मिलेंगे।`,
        status: "PUBLISHED",
      } as any),
    };

    await saveProduct(newProduct);
    await loadProducts();
    setView("LIST");
    setIsValidated(false);
  };

  const handleRunOracleTest = () => {
    // We need a dummy policy to evaluate against. Use the first product (Drought Shield or whatever)
    const product = products[0];
    if (!product) return;

    const dummyPolicy = bindPolicy(product, "demo-farmer");
    const now = Date.now();

    const readingsRaw = [
      { id: "A", v: oracleTest.A, age: 0 },
      { id: "B", v: oracleTest.B, age: 0 },
      {
        id: "C",
        v: cState === "TIMEOUT" ? null : oracleTest.C,
        age: cState === "STALE" ? 2 * 60 * 60 * 1000 : 0,
      },
    ];

    const readings = readingsRaw.map((r) =>
      validateReading(
        {
          sourceId: r.id,
          value: r.v,
          timestamp: now - r.age,
        },
        now,
        product.oracleConfig.maxSourceAgeMs,
      ),
    );

    const record = evaluatePolicy(dummyPolicy, readings, product.oracleConfig);
    setTestEval(record);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold tracking-wider text-blue-400">
            INSURE-X
          </h1>
          <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">
            Insurer Portal
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button
            onClick={() => setTab("DASHBOARD")}
            className={`w-full text-left p-3 rounded-lg \${tab === 'DASHBOARD' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setTab("PRODUCTS")}
            className={`w-full text-left p-3 rounded-lg \${tab === 'PRODUCTS' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            🛡️ Products
          </button>
          <button
            onClick={() => setTab("ORACLE")}
            className={`w-full text-left p-3 rounded-lg \${tab === 'ORACLE' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            📡 Oracle Health
          </button>
          <div className="w-full text-left p-3 rounded-lg text-gray-600 cursor-not-allowed">
            Policies
          </div>
          <div className="w-full text-left p-3 rounded-lg text-gray-600 cursor-not-allowed">
            Settlements
          </div>
        </nav>
        <div className="p-4 border-t border-gray-800 text-sm text-gray-500">
          Demo Operator Session
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {tab === "DASHBOARD" && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Dashboard Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">
                  Active Policies
                </div>
                <div className="text-4xl font-extrabold text-gray-900">
                  1,248
                </div>
                <div className="text-xs text-gray-400 mt-2 font-mono">
                  Demo Data
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">
                  Triggered Claims
                </div>
                <div className="text-4xl font-extrabold text-red-600">84</div>
                <div className="text-xs text-gray-400 mt-2 font-mono">
                  Demo Data
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">
                  Pending Settlements
                </div>
                <div className="text-4xl font-extrabold text-orange-500">3</div>
                <div className="text-xs text-gray-400 mt-2 font-mono">
                  Demo Data
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="text-gray-500 text-sm font-bold uppercase mb-2">
                  Total Payouts
                </div>
                <div className="text-4xl font-extrabold text-green-600">
                  ₹8.4L
                </div>
                <div className="text-xs text-gray-400 mt-2 font-mono">
                  Demo Data
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "PRODUCTS" && (
          <div className="max-w-6xl mx-auto">
            {view === "LIST" ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">
                    Insurance Products
                  </h2>
                  <button
                    onClick={() => {
                      setView("CREATE");
                      setIsValidated(false);
                      setValidationResult(null);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md"
                  >
                    + Add Product
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-gray-900">
                          {p.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded-md \${(p as any).status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                        >
                          {(p as any).status || "DRAFT"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        Version {p.version}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Crop</span>
                          <span className="font-bold">{p.crop}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Premium</span>
                          <span className="font-bold text-orange-600">
                            ₹{p.premium}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Payout</span>
                          <span className="font-bold text-green-600">
                            ₹{p.payout}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rule</span>
                          <span className="font-bold">
                            {p.trigger.index} {p.trigger.operator}{" "}
                            {p.trigger.threshold}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="max-w-3xl bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                <button
                  onClick={() => setView("LIST")}
                  className="text-gray-500 mb-6 font-medium"
                >
                  ← Back to List
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Create Insurance Product
                </h2>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Crop
                    </label>
                    <input
                      type="text"
                      value={form.crop}
                      onChange={(e) =>
                        setForm({ ...form, crop: e.target.value })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-6">
                    <h3 className="font-bold text-gray-800 mb-4">Financials</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Premium (₹)
                    </label>
                    <input
                      type="number"
                      value={form.premium}
                      onChange={(e) =>
                        setForm({ ...form, premium: Number(e.target.value) })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Payout (₹)
                    </label>
                    <input
                      type="number"
                      value={form.payout}
                      onChange={(e) =>
                        setForm({ ...form, payout: Number(e.target.value) })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Coverage Duration (days)
                    </label>
                    <input
                      type="number"
                      value={form.coverageDays}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          coverageDays: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>

                  <div className="col-span-2 border-t pt-6">
                    <h3 className="font-bold text-gray-800 mb-4">
                      Trigger Configuration
                    </h3>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Index
                    </label>
                    <input
                      type="text"
                      value={form.index}
                      onChange={(e) =>
                        setForm({ ...form, index: e.target.value })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Operator
                    </label>
                    <select
                      value={form.operator}
                      onChange={(e) =>
                        setForm({ ...form, operator: e.target.value })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    >
                      <option value="<">&lt; (Less than)</option>
                      <option value=">">&gt; (Greater than)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Threshold (mm)
                    </label>
                    <input
                      type="number"
                      value={form.threshold}
                      onChange={(e) =>
                        setForm({ ...form, threshold: Number(e.target.value) })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Aggregation
                    </label>
                    <select
                      value={form.aggregation}
                      onChange={(e) =>
                        setForm({ ...form, aggregation: e.target.value })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    >
                      <option value="median">Median</option>
                      <option value="average">Average</option>
                    </select>
                  </div>

                  <div className="col-span-2 border-t pt-6">
                    <h3 className="font-bold text-gray-800 mb-4">
                      Oracle Abstraction
                    </h3>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Required Sources
                    </label>
                    <input
                      type="number"
                      value={form.requiredSources}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          requiredSources: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Min Valid Sources
                    </label>
                    <input
                      type="number"
                      value={form.minimumValidSources}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          minimumValidSources: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Max Source Age (mins)
                    </label>
                    <input
                      type="number"
                      value={form.maxSourceAgeMinutes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maxSourceAgeMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Disagreement Tolerance
                    </label>
                    <input
                      type="number"
                      value={form.maxDisagreement}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          maxDisagreement: Number(e.target.value),
                        })
                      }
                      className="w-full p-3 border rounded-xl bg-gray-50"
                    />
                  </div>
                </div>

                {validationResult && (
                  <div
                    className={`p-4 rounded-xl mb-6 font-bold \${isValidated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {validationResult}
                  </div>
                )}

                <div className="flex gap-4">
                  {!isValidated ? (
                    <button
                      onClick={handleValidate}
                      className="px-8 py-4 bg-gray-800 text-white font-bold rounded-xl shadow-md"
                    >
                      Validate Product
                    </button>
                  ) : (
                    <button
                      onClick={handlePublish}
                      className="px-8 py-4 bg-green-600 text-white font-bold rounded-xl shadow-md"
                    >
                      Publish Product
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "ORACLE" && (
          <div className="max-w-6xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Oracle Health
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-xl">Oracle A</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                    ✓ Healthy
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  72 mm
                </div>
                <div className="text-sm text-gray-500">Fresh reading</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-xl">Oracle B</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                    ✓ Healthy
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  74 mm
                </div>
                <div className="text-sm text-gray-500">Fresh reading</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-xl">Oracle C</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                    ⚠ Warning
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  4 mm
                </div>
                <div className="text-sm text-gray-500">Possible outlier</div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4 border-t pt-8">
              Oracle Test Controls
            </h2>
            <p className="text-gray-500 mb-6">
              Development/Demo-only section to test generic Policy Engine
              robustness.
            </p>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Controls */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex-1">
                <h3 className="text-xl font-bold mb-6">Input Readings</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="w-20 font-bold">Oracle A</span>
                    <input
                      type="number"
                      value={oracleTest.A}
                      onChange={(e) =>
                        setOracleTest({
                          ...oracleTest,
                          A: Number(e.target.value),
                        })
                      }
                      className="w-24 p-2 border rounded"
                    />
                    <span className="text-sm text-gray-500">Fresh</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-20 font-bold">Oracle B</span>
                    <input
                      type="number"
                      value={oracleTest.B}
                      onChange={(e) =>
                        setOracleTest({
                          ...oracleTest,
                          B: Number(e.target.value),
                        })
                      }
                      className="w-24 p-2 border rounded"
                    />
                    <span className="text-sm text-gray-500">Fresh</span>
                  </div>
                  <div className="flex items-center gap-4 border-t pt-4">
                    <span className="w-20 font-bold">Oracle C</span>
                    <input
                      type="number"
                      value={oracleTest.C}
                      onChange={(e) =>
                        setOracleTest({
                          ...oracleTest,
                          C: Number(e.target.value),
                        })
                      }
                      disabled={cState === "TIMEOUT"}
                      className="w-24 p-2 border rounded disabled:opacity-50"
                    />
                    <select
                      value={cState}
                      onChange={(e) => setCState(e.target.value as any)}
                      className="p-2 border rounded text-sm"
                    >
                      <option value="NORMAL">Fresh</option>
                      <option value="STALE">Stale (9 days old)</option>
                      <option value="TIMEOUT">Nonresponsive (Timeout)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleRunOracleTest}
                    className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-md"
                  >
                    Evaluate (Attack Test)
                  </button>
                </div>
              </div>

              {/* Evaluation Output */}
              <div className="flex-[1.5] bg-gray-900 text-green-400 p-8 rounded-2xl shadow-lg font-mono text-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bg-gray-800 p-2 text-center text-gray-400 font-bold text-xs tracking-widest uppercase">
                  Evaluation Record
                </div>

                <div className="mt-6 space-y-4">
                  {testEval ? (
                    <>
                      <div>
                        <span className="text-gray-500">Evaluation ID:</span>{" "}
                        <span className="text-white">
                          {testEval.evaluationId}
                        </span>
                        <br />
                        <span className="text-gray-500">Policy:</span>{" "}
                        <span className="text-white">
                          {testEval.productId} v{testEval.productVersion}
                        </span>
                      </div>

                      <div className="border-t border-gray-700 pt-4">
                        {testEval.oracleReadings.map((r) => (
                          <div
                            key={r.sourceId}
                            className="flex justify-between mb-1"
                          >
                            <span>
                              Oracle {r.sourceId}{" "}
                              <span className="text-white">
                                ({r.value ?? "NULL"} mm)
                              </span>
                            </span>
                            {r.status === "RESPONDING" &&
                            r.sourceId === "C" &&
                            r.value === 4 ? (
                              <span className="text-orange-400">
                                ⚠ SUSPICIOUS / OUTLIER
                              </span>
                            ) : r.status === "RESPONDING" ? (
                              <span className="text-green-500">✓ VALID</span>
                            ) : (
                              <span className="text-red-400">{r.status}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-700 pt-4 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Aggregation:</span>
                          <span className="text-white uppercase">
                            {testEval.aggregationMethod}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            Aggregated value:
                          </span>
                          <span className="text-white font-bold">
                            {testEval.aggregatedValue !== null
                              ? `\${testEval.aggregatedValue} mm`
                              : "NULL"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Rule:</span>
                          <span className="text-white">
                            {testEval.aggregatedValue !== null
                              ? testEval.aggregatedValue
                              : "?"}{" "}
                            {testEval.rule.operator} {testEval.rule.threshold}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-gray-700 pt-4 pb-2 mt-4 text-lg font-bold flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Decision:</span>
                        <span
                          className={
                            testEval.decision === "TRIGGER"
                              ? "text-green-500"
                              : testEval.decision === "HOLD"
                                ? "text-orange-500"
                                : "text-blue-500"
                          }
                        >
                          {testEval.decision === "TRIGGER"
                            ? "🟢 TRIGGER"
                            : testEval.decision === "HOLD"
                              ? "🟠 HOLD"
                              : "🔵 NO_TRIGGER"}
                        </span>
                      </div>

                      {testEval.reason && (
                        <div className="bg-red-900/30 text-red-400 p-3 rounded-lg border border-red-900/50">
                          Reason: {testEval.reason} <br />
                          (No automatic payout will be created)
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500 text-center py-20 flex flex-col items-center">
                      <span className="text-4xl mb-4">⏱️</span>
                      Waiting for evaluation trigger...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
