import sanitize from 'sanitize-html';

/**
 * Safely sanitizes HTML content for rendering.
 * Removes <script>, <iframe> (unless whitelisted), and other dangerous tags.
 * SERVER-SIDE ONLY: This imports a heavy library.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  return sanitize(html, {
    allowedTags: sanitize.defaults.allowedTags.concat([
      'iframe',
      'img',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'span',
      'div',
    ]),
    allowedAttributes: {
      ...sanitize.defaults.allowedAttributes,
      iframe: [
        'src',
        'allow',
        'allowfullscreen',
        'frameborder',
        'scrolling',
        'target',
        'width',
        'height',
      ],
      img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'style', 'class'],
      a: ['href', 'name', 'target', 'rel', 'title', 'class'],
      div: ['class', 'style'],
      span: ['class', 'style'],
      '*': ['style', 'class'],
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    allowProtocolRelative: true,
    enforceHtmlBoundary: false,
  });
}
