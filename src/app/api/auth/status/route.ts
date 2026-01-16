import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('site_token');
  const isAdmin = token?.value === process.env.ACCESS_TOKEN;

  return NextResponse.json({ isAdmin });
}
