import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const productsDir = path.join(process.cwd(), 'products');
  const files = fs.readdirSync(productsDir).filter(f => f.endsWith('.json'));
  const products = files.map(file => {
    const data = fs.readFileSync(path.join(productsDir, file), 'utf-8');
    return JSON.parse(data);
  });
  return NextResponse.json(products);
}
