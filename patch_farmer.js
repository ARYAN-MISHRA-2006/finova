const fs = require('fs');
let content = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

const replacements = [
  ['उपलब्ध राशि<', 'उपलब्ध राशि (Available Balance)<'],
  ['पैसे खर्च करें<', 'पैसे खर्च करें (Spend Money)<'],
  ['\\[भुगतान QR बनाएं\\]', '[भुगतान QR बनाएं] (Generate Payment QR)'],
  ['भुगतान QR<', 'भुगतान QR (Payment QR)<'],
  ['शेष राशि: ₹', 'शेष राशि (Remaining Balance): ₹'],
  ['यह QR केवल इस भुगतान के लिए है।<', 'यह QR केवल इस भुगतान के लिए है। (This QR is only for this payment.)<'],
  ['हाल के लेन-देन<', 'हाल के लेन-देन (Recent Transactions)<'],
  ['यह सुविधा जल्द आ रही है<', 'यह सुविधा जल्द आ रही है (This feature is coming soon)<'],
  ['होम<', 'होम (Home)<'],
  ['बीमा<', 'बीमा (Insurance)<'],
  ['वॉलेट<', 'वॉलेट (Wallet)<'],
  ['आवाज़<', 'आवाज़ (Voice)<'],
  ['प्रोफ़ाइल<', 'प्रोफ़ाइल (Profile)<'],
  ['सक्रिय बीमा<', 'सक्रिय बीमा (Active Insurance)<'],
  ['उपलब्ध योजनाएं<', 'उपलब्ध योजनाएं (Available Plans)<'],
  ['बीमा खरीदें<', 'बीमा खरीदें (Buy Insurance)<'],
  ['भुगतान<', 'भुगतान (Payout)<'],
  ['इस बीमा के बारे में सुनें<', 'इस बीमा के बारे में सुनें (Listen about this insurance)<'],
  ['▶️ जारी रखें<', '▶️ जारी रखें (Continue)<'],
  ['⏸️ रोकें<', '⏸️ रोकें (Pause)<'],
  ['⏹️ बंद<', '⏹️ बंद (Stop)<'],
  ['पहले समझें (Understand First)<', 'पहले समझें (Understand First)<'],
  ['बीमा सक्रिय करने से पहले एक सवाल का जवाब दें।<', 'बीमा सक्रिय करने से पहले एक सवाल का जवाब दें। (Answer a question before activating.)<'],
  ['अगर बारिश', 'अगर बारिश (If rainfall)'],
  ['सुन रहा है...<', 'सुन रहा है... (Listening...)<'],
  ['बोलकर जवाब दें<', 'बोलकर जवाब दें (Answer by speaking)<'],
  ['❌ सही नहीं है<', '❌ सही नहीं है (Incorrect)<'],
  ['कृपया फिर से प्रयास करें।<', 'कृपया फिर से प्रयास करें। (Please try again.)<'],
  ['🔊 फिर से सुनें<', '🔊 फिर से सुनें (Listen again)<'],
  ['✅ सही उत्तर<', '✅ सही उत्तर (Correct Answer)<'],
  ['आपने बीमा की शर्तें समझ ली हैं।<', 'आपने बीमा की शर्तें समझ ली हैं। (You have understood the terms.)<'],
  ['\\[आगे बढ़ें\\]', '[आगे बढ़ें] (Proceed)'],
  ['पुष्टि करें<', 'पुष्टि करें (Confirm)<'],
  ['प्रीमियम<', 'प्रीमियम (Premium)<'],
  ['संभावित भुगतान<', 'संभावित भुगतान (Potential Payout)<'],
  ['प्रतीक्षा करें...<', 'प्रतीक्षा करें... (Please wait...)<'],
  ['\\[बीमा सक्रिय करें\\]', '[बीमा सक्रिय करें] (Activate Insurance)'],
  ['आपका बीमा सक्रिय हो गया।<', 'आपका बीमा सक्रिय हो गया। (Your insurance is activated.)<'],
  ['फ़सल<', 'फ़सल (Crop)<'],
  ['अवधि<', 'अवधि (Duration)<'],
  ['होम पर जाएं<', 'होम पर जाएं (Go to Home)<']
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/app/farmer/page.tsx', content);
