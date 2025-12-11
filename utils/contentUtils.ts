
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


