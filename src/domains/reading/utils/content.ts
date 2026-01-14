export function removeEmptyParagraphs(html: string): string {
  if (!html) return html;
  return html.replace(/<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '');
}

export function stripTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

export function stripLeadingTitle(contentHtml: string, title: string): string {
  if (!contentHtml || !title) return contentHtml;
  try {
    const h1Match = contentHtml.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      const h1Text = stripTags(h1Match[1]).toLowerCase().trim();
      const titleLower = title.toLowerCase().trim();
      if (
        h1Text &&
        (h1Text === titleLower || h1Text.includes(titleLower) || titleLower.includes(h1Text))
      ) {
        return contentHtml.replace(h1Match[0], '');
      }
    }

    const textStart = stripTags(contentHtml).trim();
    if (textStart.toLowerCase().startsWith(title.toLowerCase().trim())) {
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return contentHtml.replace(new RegExp('^\\s*' + escapedTitle), '');
    }
  } catch (e) {
    console.error('stripLeadingTitle error', e);
  }
  return contentHtml;
}

export function cleanAIContent(input: string | any[] | undefined | null): string {
  if (!input) return '';

  if (Array.isArray(input)) {
    return input.filter((item) => typeof item === 'string').join('\n\n');
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('["') && trimmed.endsWith('"]')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string').join('\n\n');
        }
      } catch (_) {
        let cleaned = trimmed;
        if (cleaned.startsWith('["')) cleaned = cleaned.slice(2);
        if (cleaned.endsWith('"]')) cleaned = cleaned.slice(0, -2);
        return cleaned;
      }
    }
    if (trimmed.startsWith('["')) {
      return trimmed.slice(2);
    }
    return input;
  }

  return String(input);
}

export function cleanGeminiJson(text: string): string {
  if (!text) return '';

  const codeBlockMatch = text.match(/```json?\s*([\s\S]*?)\s*```/);
  const coreContent = codeBlockMatch ? codeBlockMatch[1] : text;

  const startBracket = coreContent.search(/[[{]/);
  const endBracket = coreContent.lastIndexOf(coreContent.match(/[\]}]/)?.[0] || '');

  if (startBracket !== -1 && endBracket !== -1 && endBracket >= startBracket) {
    return coreContent.slice(startBracket, endBracket + 1).trim();
  }

  return coreContent
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}
