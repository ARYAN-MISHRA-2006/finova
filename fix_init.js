const fs = require('fs');
let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

const oldCheck = /getLocalState\('session_userId'\)\.then\(uid => \{[\s\S]*?if \(uid\) \{[\s\S]*?setUserId\(uid\);[\s\S]*?setScreen\('MAIN_APP'\);[\s\S]*?\}[\s\S]*?\}\);/;
const newCheck = `getLocalState('session_userId').then(uid => {
      if (uid === 'Ramu' || uid === 'Sita') {
        setUserId(uid);
        setScreen('MAIN_APP');
      } else if (uid) {
        // Clear invalid old session state from previous iterations
        setLocalState('session_userId', null);
      }
    });`;

code = code.replace(oldCheck, newCheck);
fs.writeFileSync('src/app/farmer/page.tsx', code);
