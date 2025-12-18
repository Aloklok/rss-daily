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
