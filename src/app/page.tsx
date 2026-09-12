export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-8">INSURE-X / FINOVA</h1>
      <div className="flex gap-4">
        <a href="/farmer" className="px-6 py-4 bg-blue-600 text-white rounded shadow-lg text-lg hover:bg-blue-700">Go to Farmer UI</a>
        <a href="/insurer" className="px-6 py-4 bg-gray-800 text-white rounded shadow-lg text-lg hover:bg-gray-900">Go to Insurer UI</a>
      </div>
    </div>
  );
}
