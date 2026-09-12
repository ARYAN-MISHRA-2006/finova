const fs = require('fs');
let content = fs.readFileSync('src/app/merchant/page.tsx', 'utf8');

const replacements = [
  ['🏪 Seed Seller', '🏪 बीज विक्रेता (Seed Seller)'],
  ['[भुगतान स्वीकार करें]', '[भुगतान स्वीकार करें] (Accept Payment)'],
  ['✅ भुगतान दर्ज हो गया', '✅ भुगतान दर्ज हो गया (Payment Recorded)'],
  ['📡 ऑफ़लाइन', '📡 ऑफ़लाइन (Offline)'],
  ['⏳ Sync बाकी', '⏳ Sync बाकी (Sync Pending)']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/app/merchant/page.tsx', content);
