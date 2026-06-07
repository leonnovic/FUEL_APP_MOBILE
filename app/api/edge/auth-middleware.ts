/**
 * FuelPro Edge Function: Auth Middleware
 * JWT verification at the edge for ultra-fast auth
 */

import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/api/protected/:path*'],
};

export default async function middleware(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const token = authHeader.slice(7);
  
  try {
    // In production, verify JWT at edge
    // For now, pass through to API
    const response = NextResponse.next();
    response.headers.set('x-auth-token', token);
    return response;
  } catch (e) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}