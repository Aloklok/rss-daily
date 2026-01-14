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
      img: [
        'src',
        'srcset',
        'sizes',
        'alt',
        'title',
        'width',
        'height',
        'loading',
        'style',
        'class',
      ],
      a: ['href', 'name', 'target', 'rel', 'title', 'class'],
      div: ['class', 'style'],
      span: ['class', 'style'],
      '*': ['style', 'class'],
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel'],
    allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
    allowProtocolRelative: true,
    enforceHtmlBoundary: false,
    transformTags: {
      img: (tagName, attribs) => {
        if (!attribs.src) return { tagName, attribs };

        // 1. Skip if already internal or data URI
        if (attribs.src.startsWith('/') || attribs.src.startsWith('data:')) {
          return { tagName, attribs };
        }

        // 2. Intelligent Weserv.nl Integration
        const isWeserv =
          attribs.src.includes('images.weserv.nl') || attribs.src.includes('wsrv.nl');
        let baseUrl = attribs.src;

        if (isWeserv) {
          // If already Weserv, allow cleaner manipulation or just trust it?
          // Ideally, we strip existing params to rebuild our standard set,
          // but generic approach: treat the 'url' param as source if possible.
          // Simpler: Just rely on src, but let's try to extract the original url if possible for cleaner reconstruction.
          try {
            const u = new URL(attribs.src);
            const deepUrl = u.searchParams.get('url');
            if (deepUrl) baseUrl = deepUrl; // unwrapping double proxies or previous runs
          } catch (_e) {
            // ignore
          }
        }

        // Common Param Builder
        const makeUrl = (w: number) => {
          return `https://images.weserv.nl/?url=${encodeURIComponent(baseUrl)}&w=${w}&output=webp&q=75&we`;
        };

        // Generate Responsive Set
        // 480w: Mobile phones (low data or small screen)
        // 800w: Standard article width (matches max-w-3xl prose ~ 768px)
        // 1200w: High DPI screens (Retina) zooming in
        const finalSrc = makeUrl(800);
        const finalSrcset = `${makeUrl(480)} 480w, ${makeUrl(800)} 800w, ${makeUrl(1200)} 1200w`;

        // Sizes:
        // On screens smaller than 768px (md), image takes full width (100vw).
        // On larger screens, content is capped at ~768px (max-w-3xl).
        const finalSizes = '(max-width: 768px) 100vw, 768px';

        return {
          tagName,
          attribs: {
            ...attribs,
            src: finalSrc,
            srcset: finalSrcset,
            sizes: finalSizes,
            loading: 'lazy', // Force lazy loading
            // Reset dimensions? Weserv handles resizing, but keeping original attributes might cause layout shift
            // if we don't know the new aspect ratio.
            // Best practice: Let Weserv handle it. We can't fix CLS perfectly on the server without knowing image metadata.
          },
        };
      },
    },
  });
}
