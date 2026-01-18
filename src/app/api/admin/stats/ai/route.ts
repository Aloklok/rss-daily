import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDashboardStats } from '@/domains/reading/services/stats';
import { getDashboardAiSummary } from '@/domains/intelligence/services/dashboard-summary';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Check Auth
  const accessToken = process.env.ACCESS_TOKEN;
  const cookieStore = await cookies();
  const siteToken = cookieStore.get('site_token')?.value;

  if (!accessToken || siteToken !== accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch Stats again (DB is fast enough to repeat this vs complexity of passing data)
    const stats = await getDashboardStats();

    // 3. Generate AI Summary
    const aiSummary = await getDashboardAiSummary(stats);

    return NextResponse.json({ aiSummary });
  } catch (error) {
    console.error('AI Summary Error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
