import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const policyData = await req.json();
  const productsDir = path.join(process.cwd(), 'products');
  
  if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir);
  }
  
  const filePath = path.join(productsDir, `${policyData.productId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(policyData, null, 2), 'utf-8');
  
  return NextResponse.json({ success: true, policyData });
}
