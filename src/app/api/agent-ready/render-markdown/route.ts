import { NextRequest, NextResponse } from 'next/server';
import TurndownService from 'turndown';
import { fetchArticleById, fetchArticleContent, fetchBriefingData } from '@/domains/reading/services';
import { zh, en } from '@/app/i18n/dictionaries';

/**
 * Markdown Rendering API for Agents
 * Converts articles and briefings into clean Markdown.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '';
  const { origin } = new URL(request.url);

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  try {
    // 1. Article Pattern: /en/article/[id] or /article/[id]
    const articleMatch = path.match(/^\/(?:en\/)?article\/([a-f0-9]+)$/i);
    if (articleMatch) {
      const articleId = articleMatch[1];
      const isEn = path.startsWith('/en/');
      const dict = isEn ? en : zh;

      // Parallel fetch article metadata and full content
      const [metaResult, contentData] = await Promise.all([
        fetchArticleById(articleId, { lang: isEn ? 'en' : 'zh' }),
        fetchArticleContent(articleId)
      ]);

      if (!metaResult.success) {
        return new Response('# Article Not Found', { status: 404, headers: { 'Content-Type': 'text/markdown' } });
      }

      const article = metaResult.article;
      const mainContent = contentData?.content || article.summary || article.tldr || '';

      const markdown = `
# ${article.title}

**${dict.reader.source}**: ${article.sourceName || 'Unknown'}
**${dict.reader.original}**: ${article.link}

---

${turndownService.turndown(mainContent)}
      `.trim();

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
        }
      });
    }

    // 2. Date Pattern: /en/date/[date] or /date/[date]
    const dateMatch = path.match(/^\/(?:en\/)?date\/(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      const date = dateMatch[1];
      const isEn = path.startsWith('/en/');
      const dict = isEn ? en : zh;

      const groupedArticles = await fetchBriefingData(date, isEn ? 'en' : 'zh');

      if (!groupedArticles || Object.values(groupedArticles).flat().length === 0) {
        return new Response(`# No Briefing Found for ${date}`, { status: 404, headers: { 'Content-Type': 'text/markdown' } });
      }

      let markdown = `# Daily Briefing - ${date}\n\n`;
      
      // The fetchBriefingData already returns groups like IMPORTANT, MUST_KNOW, REGULAR
      for (const [section, items] of Object.entries(groupedArticles)) {
        if (!items || items.length === 0) continue;
        
        markdown += `## ${section}\n\n`;
        items.forEach(item => {
          markdown += `### ${item.title}\n`;
          markdown += `*Source: ${item.sourceName}* | [Read More](${origin}${isEn ? '/en' : ''}/article/${item.id})\n\n`;
          if (item.summary || item.tldr) {
            markdown += `${item.summary || item.tldr}\n\n`;
          }
        });
      }

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept',
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
        }
      });
    }

    return new Response('# Unsupported Path for Markdown Conversion', { status: 400, headers: { 'Content-Type': 'text/markdown' } });

  } catch (error) {
    console.error('[Markdown-Render-Error]', error);
    return new Response('# Internal Server Error during Markdown Rendering', { status: 500, headers: { 'Content-Type': 'text/markdown' } });
  }
}
