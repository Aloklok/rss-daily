import { NextResponse, NextRequest } from 'next/server';
import { logServerBotHit } from '@/domains/security/services/bot-logger';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * API 端点：记录服务端捕捉到的错误
 *
 * 用途：
 * 1. 客户端 5xx 错误（由 error.tsx / global-error.tsx 调用）
 * 2. 服务端 404 错误（由页面组件在调用 notFound() 之前调用）
 *
 * POST /api/system/log-error
 * Body: { path, userAgent?, status, errorDigest?, reason? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, userAgent, status, errorDigest, reason } = body;

    if (!path || !status) {
      return NextResponse.json({ error: 'Missing required fields: path, status' }, { status: 400 });
    }

    // 获取请求头
    const headersList = await headers();

    // 构建 meta 对象
    const meta: Record<string, unknown> = {
      source: 'log-error-api',
      reason: reason || null,
      errorDigest: errorDigest || null,
    };

    // 使用传入的 userAgent 或从 headers 获取
    const ua = userAgent || headersList.get('user-agent') || 'unknown';

    // 记录到 bot_hits 表
    await logServerBotHit(path, ua, headersList, status, meta);

    // 可选：记录到控制台用于 Vercel 日志
    if (status >= 500) {
      console.warn(
        `[5xx-ERROR] Path: ${path} | Status: ${status} | Digest: ${errorDigest || 'N/A'}`,
      );
    } else if (status === 404) {
      console.log(`[404-ERROR] Path: ${path} | Reason: ${reason || 'N/A'}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[log-error API] Failed:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
