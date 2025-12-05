import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
        return NextResponse.json({ isAdmin: false, error: 'Server misconfiguration' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const siteToken = cookieStore.get('site_token')?.value;

    if (siteToken === accessToken) {
        return NextResponse.json({ isAdmin: true });
    }

    return NextResponse.json({ isAdmin: false });
}
