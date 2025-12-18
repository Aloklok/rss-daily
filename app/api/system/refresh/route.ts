import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Redirect to the root of the application
  return NextResponse.redirect(new URL('/', request.url));
}
