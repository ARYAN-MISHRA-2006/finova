const fs = require('fs');
let content = fs.readFileSync('src/lib/idb.ts', 'utf8');

const replacements = [
  [
    'description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 100 mm से कम रहती है, तो आपको ₹10,000 का भुगतान मिलेगा।",',
    'description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 100 mm से कम रहती है, तो आपको ₹10,000 का भुगतान मिलेगा। (If rainfall in your area is less than 100 mm during the coverage period, you will receive a payout of ₹10,000.)",',
  ],
  [
    'voiceText: "यह सूखे से बचाव का बीमा है। यदि बीमा अवधि के दौरान आपके क्षेत्र में बारिश तय सीमा से कम रहती है, तो आपको दस हजार रुपये का भुगतान मिलेगा।",',
    'voiceText: "यह सूखे से बचाव का बीमा है। यदि बीमा अवधि के दौरान आपके क्षेत्र में बारिश तय सीमा से कम रहती है, तो आपको दस हजार रुपये का भुगतान मिलेगा। (This is drought protection insurance. If rainfall is below the limit, you will get ten thousand rupees.)",',
  ]
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/lib/idb.ts', content);
