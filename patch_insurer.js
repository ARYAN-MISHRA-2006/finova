const fs = require('fs');
let content = fs.readFileSync('src/app/insurer/page.tsx', 'utf8');

const replacements = [
  [
    'description: `अगर बीमा अवधि के दौरान बारिश ${form.threshold} mm ${form.operator === ">" ? "से अधिक" : "से कम"} रहती है, तो आपको ₹${form.payout} का भुगतान मिलेगा।`,',
    'description: `अगर बीमा अवधि के दौरान बारिश ${form.threshold} mm ${form.operator === ">" ? "से अधिक" : "से कम"} रहती है, तो आपको ₹${form.payout} का भुगतान मिलेगा। (If rainfall during coverage is ${form.operator === ">" ? "more than" : "less than"} ${form.threshold} mm, you will receive a payout of ₹${form.payout}.)`,',
  ],
  [
    'voiceText: `यह ${form.name} है। यदि बारिश ${form.threshold} mm ${form.operator === ">" ? "से अधिक" : "से कम"} होती है, तो आपको ${form.payout} रुपये मिलेंगे।`,',
    'voiceText: `यह ${form.name} है। यदि बारिश ${form.threshold} mm ${form.operator === ">" ? "से अधिक" : "से कम"} होती है, तो आपको ${form.payout} रुपये मिलेंगे। (This is ${form.name}. If rainfall is ${form.operator === ">" ? "more than" : "less than"} ${form.threshold} mm, you will receive ${form.payout} rupees.)`,',
  ]
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/app/insurer/page.tsx', content);
