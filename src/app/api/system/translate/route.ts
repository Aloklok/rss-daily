import { NextRequest, NextResponse } from 'next/server';
import { translateAndSave, ArticleToTranslate } from '@/domains/intelligence/services/translate';
import { DEFAULT_TRANSLATION_MODEL } from '@/domains/intelligence/constants';

/**
 * 翻译 API - 供 Supabase Webhook 调用
 * 
 * 触发条件：articles 表 INSERT 事件
 * 功能：自动将新文章翻译为英文并存入 articles_en 表
 */
async function handleTranslate(request: NextRequest): Promise<NextResponse> {
    const secret = request.nextUrl.searchParams.get('secret');

    // 验证密钥
    if (secret !== process.env.REVALIDATION_SECRET) {
        console.log('[Translate API] Invalid secret');
        return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    try {
        const body = await request.json();
        console.log('[Translate API] Received webhook request');

        // 从 Supabase Webhook Payload 提取文章数据
        const record = body.record || body;

        if (!record.id) {
            console.log('[Translate API] No article id in payload');
            return NextResponse.json({ message: 'No article id' }, { status: 400 });
        }

        // 检查是否有足够内容需要翻译
        if (!record.summary && !record.tldr) {
            console.log(`[Translate API] Article ${record.id} has no AI content yet, skipping`);
            return NextResponse.json({
                message: 'No AI content to translate yet',
                articleId: record.id
            });
        }

        // 构造翻译输入（核心重构：不再重复复制冗余元数据，由数据库视图处理物理关联）
        const articleToTranslate: ArticleToTranslate = {
            id: String(record.id),
            title: record.title || '',
            category: record.category || '',
            summary: record.summary || '',
            tldr: record.tldr || '',
            highlights: record.highlights || '',
            critiques: record.critiques || '',
            marketTake: record.marketTake || '',
            keywords: Array.isArray(record.keywords) ? record.keywords : [],
            // 我们保留这些字段定义，但 service 层将不再持久化它们到物理表 articles_en
            link: record.link,
            sourceName: record.sourceName,
            published: record.published,
            n8n_processing_date: record.n8n_processing_date,
            verdict: record.verdict,
        };

        // 执行翻译并保存
        const result = await translateAndSave(articleToTranslate, DEFAULT_TRANSLATION_MODEL);

        if (result.success) {
            console.log(`[Translate API] Successfully translated article ${record.id}`);
            return NextResponse.json({
                success: true,
                articleId: record.id,
                model: DEFAULT_TRANSLATION_MODEL
            });
        } else {
            console.error(`[Translate API] Translation failed for ${record.id}:`, result.error);
            return NextResponse.json({
                success: false,
                error: result.error,
                articleId: record.id
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Translate API] Error:', error.message);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// 支持 GET 和 POST 请求
export async function GET(request: NextRequest) {
    return handleTranslate(request);
}

export async function POST(request: NextRequest) {
    return handleTranslate(request);
}
