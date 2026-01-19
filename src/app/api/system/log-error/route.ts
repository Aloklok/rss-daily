import { NextResponse, NextRequest } from 'next/server';
import { logServerBotHit } from '@/domains/security/services/bot-logger';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * API 端点：记录客户端捕捉到的 5xx 错误
 * 由 error.tsx / global-error.tsx 调用
 *
 * POST /api/system/log-error
 * Body: { path, userAgent, status, errorDigest }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, userAgent, status, errorDigest } = body;

    if (!path || !userAgent || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 获取请求头
    const headersList = await headers();

    // 记录到 bot_hits 表
    await logServerBotHit(path, userAgent, headersList, status);

    // 可选：记录到控制台用于 Vercel 日志
    console.warn(`[5xx-ERROR] Path: ${path} | Status: ${status} | Digest: ${errorDigest || 'N/A'}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[log-error API] Failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
