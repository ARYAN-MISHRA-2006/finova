import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC').all();
  return NextResponse.json({ logs });
}
