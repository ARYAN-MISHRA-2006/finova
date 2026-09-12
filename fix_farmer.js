const fs = require('fs');
let content = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

const replacements = [
  ['[भुगतान QR बनाएं]', '[भुगतान QR बनाएं] (Generate Payment QR)'],
  ['[आगे बढ़ें]', '[आगे बढ़ें] (Proceed)'],
  ['[बीमा सक्रिय करें]', '[बीमा सक्रिय करें] (Activate Insurance)'],
  ['होम पर जाएं', 'होम पर जाएं (Go to Home)'],
  ['सुन रहा है...', 'सुन रहा है... (Listening...)'],
  ['बोलकर जवाब दें', 'बोलकर जवाब दें (Answer by speaking)'],
  ['📡 ऑफ़लाइन', '📡 ऑफ़लाइन (Offline)'],
  ['प्रतीक्षा करें...', 'प्रतीक्षा करें... (Please wait...)']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/app/farmer/page.tsx', content);
