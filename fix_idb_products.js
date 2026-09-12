const fs = require('fs');
let code = fs.readFileSync('src/lib/idb.ts', 'utf8');

code += `
import { ProductConfig } from '../domain/policy';

const DEFAULT_PRODUCTS: ProductConfig[] = [
  {
    id: "drought-shield-v1",
    version: 1,
    name: "Drought Shield",
    crop: "मूंगफली (Groundnut)",
    premium: 250,
    payout: 10000,
    coverageDays: 30,
    trigger: {
      index: "rainfall",
      aggregation: "median",
      operator: "<",
      threshold: 100,
      periodDays: 30
    },
    oracleConfig: {
      requiredSources: 3,
      minimumValidSources: 2,
      maxSourceAgeMs: 3600000,
      maxDisagreementTolerance: 50
    },
    ...({
      description: "अगर बीमा अवधि के दौरान आपके क्षेत्र में बारिश 100 mm से कम रहती है, तो आपको ₹10,000 का भुगतान मिलेगा।",
      voiceText: "यह सूखे से बचाव का बीमा है। यदि बीमा अवधि के दौरान आपके क्षेत्र में बारिश तय सीमा से कम रहती है, तो आपको दस हजार रुपये का भुगतान मिलेगा।",
      status: "PUBLISHED"
    } as any)
  }
];

export async function getProducts(): Promise<ProductConfig[]> {
  const custom = await getLocalState('product_registry') || [];
  // Merge default products with custom, preferring custom if IDs match (though we version them)
  return [...DEFAULT_PRODUCTS, ...custom];
}

export async function saveProduct(product: ProductConfig) {
  const existing = await getLocalState('product_registry') || [];
  const idx = existing.findIndex((p: any) => p.id === product.id);
  if (idx >= 0) {
    existing[idx] = product;
  } else {
    existing.push(product);
  }
  await setLocalState('product_registry', existing);
}
`;

fs.writeFileSync('src/lib/idb.ts', code);
