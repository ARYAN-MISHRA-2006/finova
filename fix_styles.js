const fs = require('fs');
let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

code = code.replace(
  /className="aspect-square bg-white border-2 border-gray-100 rounded-2xl shadow-sm text-4xl flex items-center justify-center hover:bg-gray-50 cursor-pointer active:scale-95 transition-transform"/g,
  "className={`aspect-square border-2 rounded-2xl shadow-sm text-4xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${sequence.includes(icon) ? 'ring-4 ring-blue-500 bg-blue-50 border-blue-500' : 'bg-white border-gray-100 hover:bg-gray-50'}`}"
);

fs.writeFileSync('src/app/farmer/page.tsx', code);
