const fs = require('fs');
let code = fs.readFileSync('src/app/farmer/page.tsx', 'utf8');

// Update imports
code = code.replace(
  /import \{ setLocalState, getLocalState, getBalance, addTransaction, getPendingTransactions, updateTransactionStatus, WalletTransaction \} from '@\/lib\/idb';/,
  "import { setLocalState, getLocalState, getBalance, addTransaction, getPendingTransactions, updateTransactionStatus, WalletTransaction, getProducts } from '@/lib/idb';"
);

// Remove hardcoded AVAILABLE_PRODUCTS
code = code.replace(/const AVAILABLE_PRODUCTS: ProductConfig\[\] = \[\s*\{[\s\S]*?\}\s*\];/m, "");
code = code.replace(/const AVAILABLE_PRODUCTS: ProductConfig\[\] = \[\s*\{[\s\S]*?\}\s*\];/m, ""); 
// Since it's a bit long and complex regex, let's just do a string replacement for the block.
// Actually, it's safer to just let it exist but shadow it or ignore it.
// Wait, I will just add `const [availableProducts, setAvailableProducts] = useState<ProductConfig[]>([]);` inside the component.

const stateAdd = `const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [availableProducts, setAvailableProducts] = useState<ProductConfig[]>([]);`;
code = code.replace(/const \[activePolicy, setActivePolicy\] = useState<Policy \| null>\(null\);/, stateAdd);

const loadAdd = `        loadPolicyForUser(uid);
        loadWalletData(uid);
        getProducts().then(setAvailableProducts);`;
code = code.replace(/loadPolicyForUser\(uid\);\s*loadWalletData\(uid\);/, loadAdd);

// Then replace AVAILABLE_PRODUCTS with availableProducts in the render block
code = code.replace(/AVAILABLE_PRODUCTS\.filter/g, "availableProducts.filter");

fs.writeFileSync('src/app/farmer/page.tsx', code);
