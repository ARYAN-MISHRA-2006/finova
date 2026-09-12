const fs = require('fs');

// Fix page.tsx
let pageCode = fs.readFileSync('src/app/page.tsx', 'utf8');
pageCode = pageCode.replace('Who are you?', 'आप कौन हैं? (Who are you?)');
pageCode = pageCode.replace('span className="text-xl font-bold text-green-900">Farmer<', 'span className="text-xl font-bold text-green-900">किसान (Farmer)<');
pageCode = pageCode.replace('span className="text-xl font-bold text-gray-700 block">Insurer<', 'span className="text-xl font-bold text-gray-700 block">बीमाकर्ता (Insurer)<');
pageCode = pageCode.replace('uppercase tracking-wide">Coming soon<', 'uppercase tracking-wide">जल्द आ रहा है (Coming soon)<');
fs.writeFileSync('src/app/page.tsx', pageCode);

// Fix farmer/page.tsx
let farmerCode = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');
farmerCode = farmerCode.replace('Select your profile', 'अपनी प्रोफ़ाइल चुनें (Select your profile)');
farmerCode = farmerCode.replace('Verify your identity', 'अपनी पहचान सत्यापित करें (Verify your identity)');
farmerCode = farmerCode.replace('Select your pictures in the correct order', 'अपने चित्रों को सही क्रम में चुनें (Select your pictures in the correct order)');
farmerCode = farmerCode.replace('Your sequence:', 'आपका क्रम (Your sequence):');
farmerCode = farmerCode.replace('Empty</span>', 'खाली (Empty)</span>');
farmerCode = farmerCode.replace(/>\s*Clear\s*</, '>साफ़ करें (Clear)<');
farmerCode = farmerCode.replace(/>\s*Try Again\s*</, '>फिर से प्रयास करें (Try Again)<');
farmerCode = farmerCode.replace(/>\s*Verify\s*</, '>सत्यापित करें (Verify)<');
farmerCode = farmerCode.replace('← Back to profiles', '← प्रोफ़ाइल पर वापस जाएं (Back to profiles)');
farmerCode = farmerCode.replace('नमस्ते, {userId === \'Ramu\' ? \'रामू\' : \'सीता\'} 👋', 'नमस्ते, {userId === \'Ramu\' ? \'रामू\' : \'सीता\'} 👋 (Hello)');

farmerCode = farmerCode.replace('स्थिति (Status)', 'स्थिति (Status)'); // Already fine
farmerCode = farmerCode.replace('सक्रिय (Active)', 'सक्रिय (Active)');
farmerCode = farmerCode.replace('फ़सल (Crop)', 'फ़सल (Crop)');
farmerCode = farmerCode.replace('मूंगफली', 'मूंगफली (Groundnut)');
farmerCode = farmerCode.replace('प्लान (Plan)', 'प्लान (Plan)');
farmerCode = farmerCode.replace('💰 भुगतान (Payout)', '💰 भुगतान (Payout)');

farmerCode = farmerCode.replace('मौसम (Weather)', 'मौसम (Weather)');
farmerCode = farmerCode.replace('दावा (Claim)', 'दावा (Claim)');

farmerCode = farmerCode.replace('<h2 className="text-2xl font-bold">Profile</h2>', '<h2 className="text-2xl font-bold">प्रोफ़ाइल (Profile)</h2>');
farmerCode = farmerCode.replace('लॉग आउट (Log Out / Handover)', 'लॉग आउट (Log Out / Handover)');
farmerCode = farmerCode.replace('यह सुविधा जल्द आ रही है', 'यह सुविधा जल्द आ रही है (This feature is coming soon)');
farmerCode = farmerCode.replace('(Coming soon in next stage)', '');

farmerCode = farmerCode.replace('होम</span>', 'होम (Home)</span>');
farmerCode = farmerCode.replace('बीमा</span>', 'बीमा (Insurance)</span>');
farmerCode = farmerCode.replace('वॉलेट</span>', 'वॉलेट (Wallet)</span>');
farmerCode = farmerCode.replace('आवाज़</span>', 'आवाज़ (Voice)</span>');
farmerCode = farmerCode.replace('प्रोफ़ाइल</span>', 'प्रोफ़ाइल (Profile)</span>');

fs.writeFileSync('src/app/farmer/page.tsx', farmerCode);
