import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDashboardStats } from '@/domains/reading/services/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Check Auth (Async API Pattern)
  const accessToken = process.env.ACCESS_TOKEN;
  const cookieStore = await cookies();
  const siteToken = cookieStore.get('site_token')?.value;

  if (!accessToken || siteToken !== accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch Aggregated Stats Only (Fast DB Operations)
    const stats = await getDashboardStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
