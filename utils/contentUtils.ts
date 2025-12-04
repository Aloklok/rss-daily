
/**
 * Processes HTML content to ensure it renders correctly in the reader view.
 * Specifically, it replaces <title> tags (which are invisible in the body) with <h1> tags.
 */
export function processContentHtml(html: string): string {
    if (!html) return html;
    // Replace <title>...</title> with <h1>...</h1>
    // We use a regex that captures the content inside <title> tags.
    // The 'g' flag ensures all occurrences are replaced (though usually there's only one).
    // The 'i' flag makes it case-insensitive.
    return html.replace(/<title[^>]*>(.*?)<\/title>/gi, '<h1>$1</h1>');
}

/**
 * Strips the leading title from the content if it matches the article title.
 * This prevents duplicate titles from showing up (one in the header, one in the content).
 */
export function stripLeadingTitle(contentHtml: string, title: string): string {
    if (!contentHtml || !title) return contentHtml;
    try {
        // Check for <h1> tag at the start
        const h1Match = contentHtml.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
        if (h1Match && h1Match[1]) {
            const h1Text = h1Match[1].replace(/<[^>]+>/g, '').toLowerCase().trim();
            const titleLower = title.toLowerCase().trim();
            // If the h1 text is the same as the title, or contains it, or is contained by it
            if (h1Text && (h1Text === titleLower || h1Text.includes(titleLower) || titleLower.includes(h1Text))) {
                return contentHtml.replace(h1Match[0], '');
            }
        }

        // Check for plain text at the start
        const textStart = contentHtml.replace(/^\s+/, '');
        if (textStart.toLowerCase().startsWith(title.toLowerCase().trim())) {
            // Escape special regex characters in title
            const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return contentHtml.replace(new RegExp('^\\s*' + escapedTitle, 'i'), '');
        }
    } catch (e) {
        console.error('stripLeadingTitle error', e);
    }
    return contentHtml;
}
