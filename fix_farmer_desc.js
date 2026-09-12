const fs = require('fs');

let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

// 1. Add the function
const funcCode = `
function getInsuranceExplanation(product: ProductConfig): string {
    const threshold = product.trigger?.threshold;
    const operator = product.trigger?.operator;
    const payout = product.payout;

    const condition =
        operator === ">"
            ? "से अधिक"
            : operator === "<"
                ? "से कम"
                : operator === ">="
                    ? "या उससे अधिक"
                    : operator === "<="
                        ? "या उससे कम"
                        : "के बराबर";

    return \`अगर बीमा अवधि के दौरान बारिश \${threshold} mm \${condition} रहती है, तो आपको ₹\${payout.toLocaleString("en-IN")} का भुगतान मिलेगा।\`;
}
`;

// Insert after imports
code = code.replace(/const ICONS =/, funcCode + '\nconst ICONS =');

// 2. Replace description usages
// {(selectedProduct as any).description}
code = code.replace(/\{\(selectedProduct as any\)\.description\}/g, '{getInsuranceExplanation(selectedProduct)}');

// 3. Replace voiceText usages
// speakDescription((selectedProduct as any).voiceText)
code = code.replace(/speakDescription\(\(selectedProduct as any\)\.voiceText\)/g, 'speakDescription(getInsuranceExplanation(selectedProduct))');

fs.writeFileSync('src/app/farmer/page.tsx', code);
