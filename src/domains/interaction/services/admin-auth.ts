import 'server-only';
import { cookies } from 'next/headers';

export async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const accessToken = process.env.ACCESS_TOKEN;
  if (!accessToken) return false;

  const siteToken = cookieStore.get('site_token')?.value;
  return siteToken === accessToken;
}
