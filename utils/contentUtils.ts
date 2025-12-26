/**
 * Removes empty paragraphs from the HTML content.
 * Handles <p>&nbsp;</p>, <p> </p>, and other whitespace-only paragraphs.
 */
export function removeEmptyParagraphs(html: string): string {
  if (!html) return html;
  // Regex explanation:
  // <p[^>]*> : Matches <p> tag with optional attributes
  // (?:&nbsp;|\s)* : Non-capturing group matching &nbsp; or whitespace, zero or more times
  // <\/p> : Matches closing </p> tag
  // gi : Global and case-insensitive flags
  return html.replace(/<p[^>]*>(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/gi, '');
}

/**
 * Safely strips ALL HTML tags from a string using Regex.
 * Used for extracting plain text for metadata, titles, or descriptions.
 * CLIENT-SAFE: Does not use heavy libraries.
 */
export function stripTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * Removes the title from the beginning of the article content if it's duplicated.
 * This happens often in RSS feeds where the content includes the title as an H1 or plain text at the start.
 */
export function stripLeadingTitle(contentHtml: string, title: string): string {
  if (!contentHtml || !title) return contentHtml;
  try {
    // 1. Check for H1 tag match
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

    // 2. Check for text start match
    const textStart = stripTags(contentHtml).trim();
    if (textStart.toLowerCase().startsWith(title.toLowerCase().trim())) {
      // Escape special regex characters in title to prevent errors
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Remove the title from the start of the HTML string (approximately)
      // Note: This matches strictly at the start of the string, respecting whitespace.
      return contentHtml.replace(new RegExp('^\\s*' + escapedTitle), '');
    }
  } catch (e) {
    console.error('stripLeadingTitle error', e);
  }
  return contentHtml;
}

/**
 * Cleans AI-generated content fields (highlights, critiques, etc.)
 * that might be wrapped in JSON array formatting like '["content"]' OR be a raw array.
 */
export function cleanAIContent(input: string | any[] | undefined | null): string {
  if (!input) return '';

  // 1. Direct Array Handling (e.g. from Gemini API response)
  if (Array.isArray(input)) {
    return input.filter((item) => typeof item === 'string').join('\n\n');
  }

  // 2. String Handling
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Check if it starts with [" and ends with "] (JSON Array String)
    if (trimmed.startsWith('["') && trimmed.endsWith('"]')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => typeof item === 'string').join('\n\n');
        }
      } catch (_) {
        // Fallback: If it looks like it starts with [" but fails parsing, try to strip the leading [" and valid ending "]
        // Handle cases like '["Broken string' -> 'Broken string'
        // And '["Valid string"]' -> 'Valid string'
        let cleaned = trimmed;
        if (cleaned.startsWith('["')) cleaned = cleaned.slice(2);
        if (cleaned.endsWith('"]')) cleaned = cleaned.slice(0, -2);
        return cleaned;
      }
    }
    // Fallback handling also for strings that start with [" but don't end with "] (malformed JSON)
    if (trimmed.startsWith('["')) {
      // Attempt to strip just the starting [" if it looks like a broken array
      return trimmed.slice(2);
    }

    return input;
  }

  // Fallback for objects/numbers
  return String(input);
}

/**
 * Extracts JSON from a raw text response that might be wrapped in markdown code blocks.
 * Commonly used for parsing LLM (Gemini) responses.
 */
export function cleanGeminiJson(text: string): string {
  if (!text) return '';
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}
