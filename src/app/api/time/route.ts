// app/api/time/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Return server time in ms for drift checks
  return NextResponse.json({ server_ms: Date.now() })
}

