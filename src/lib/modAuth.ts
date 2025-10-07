// lib/modAuth.ts
import { NextRequest, NextResponse } from 'next/server'

export function requireModAuth(req: NextRequest): NextResponse | null {
  const header = req.headers.get('x-admin-token') ?? ''
  const token = process.env.ADMIN_TOKEN ?? ''
  if (!token || header !== token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return null
}

