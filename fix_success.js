const fs = require('fs');
let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

// 1. Add state for authSuccess
code = code.replace(
  /const \[authError, setAuthError\] = useState\(false\);/,
  "const [authError, setAuthError] = useState(false);\n  const [authSuccess, setAuthSuccess] = useState(false);"
);

// 2. Fix handleVerify logic
const verifyRegex = /const handleVerify = async \(\) => \{[\s\S]*?else \{[\s\S]*?setAuthError\(true\);[\s\S]*?\}[\s\S]*?\};/;
const newVerify = `const handleVerify = async () => {
    if (!selectedProfile) return;
    const correctSequence = PASSWORDS[selectedProfile];
    if (sequence.join('') === correctSequence.join('')) {
      setAuthSuccess(true);
      setAuthError(false);
      setTimeout(async () => {
        setUserId(selectedProfile);
        await setLocalState('session_userId', selectedProfile);
        setScreen('MAIN_APP');
        setAuthSuccess(false);
      }, 1200);
    } else {
      setAuthError(true);
    }
  };`;
code = code.replace(verifyRegex, newVerify);

// 3. Render success message
const renderSuccessRegex = /\{authError && \([\s\S]*?❌ गलत क्रम \(Wrong Sequence\)[\s\S]*?\}[\s\S]*?\)/;
const newRenderSuccess = `{authError && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 font-bold rounded-xl flex items-center w-full justify-center text-lg shadow-sm border border-red-100">
              ❌ गलत क्रम (Wrong Sequence)
            </div>
          )}
          {authSuccess && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 font-bold rounded-xl flex items-center w-full justify-center text-lg shadow-sm border border-green-100">
              ✅ पहचान सफल
            </div>
          )}`;
code = code.replace(renderSuccessRegex, newRenderSuccess);

// 4. Disable verify button during success
code = code.replace(/disabled=\{sequence\.length !== 3\}/g, "disabled={sequence.length !== 3 || authSuccess}");

fs.writeFileSync('src/app/farmer/page.tsx', code);
