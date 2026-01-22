/**
 * 轻量级 404 日志工具
 *
 * 用于页面组件在调用 notFound() 之前记录错误。
 * 这个函数不调用 headers()，因此不会触发动态渲染。
 *
 * 用法：
 * ```tsx
 * import { logBotError } from '@/app/lib/server/log-bot-error';
 *
 * if (!result.success) {
 *   await logBotError('/article/xxx', `Supabase异常: ${result.errorMessage}`);
 *   notFound();
 * }
 * ```
 */
export async function logBotError(path: string, reason: string): Promise<void> {
  // 只在服务端执行
  if (typeof window !== 'undefined') return;

  try {
    // 使用绝对 URL 或相对 URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    await fetch(`${baseUrl}/api/system/log-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        status: 404,
        reason,
      }),
    });
  } catch (e) {
    // Fire-and-forget，不阻塞页面渲染
    console.error('[logBotError] Failed to log:', e);
  }
}
