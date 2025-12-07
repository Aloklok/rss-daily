/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',            // ✅ 自动跟随系统
  content: [
    // 1. 告诉 Tailwind 扫描根目录下的所有相关文件
    "./**/*.{html,ts,tsx,mdx}",

    // 2. 但是，使用 "!" 符号，明确排除掉所有不需要扫描的目录
    "!./node_modules/**", // 排除所有 node_modules
    "!./dist/**",         // 排除构建输出目录
    "!./.vercel/**",      // 排除 Vercel 的本地缓存

    // 3. (推荐) 你的 API 目录也不包含 Tailwind 样式，一并排除
    "!./api/**",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'paper-texture': "url('/paper-texture.webp')",
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
          '"Helvetica Neue"', 'Arial', '"Noto Sans"', '"PingFang SC"', '"Hiragino Sans GB"',
          '"Microsoft YaHei"', '"Noto Sans CJK SC"', 'sans-serif'
        ],
        serif: ['var(--font-playfair)', '"Playfair Display"', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif']
      },
      colors: {
        midnight: {
          bg: '#F2F0E4',        // Slate-900 (Dark Blue)
          sidebar: '#2A2A4A',   // Gray-900
          card: '#1f2937',      // Gray-800
          selected: '#db2777',  // Pink-600
          border: '#1f2937',    // Gray-800
          'text-primary': '#000000',
          'text-reader': '#000000',    // Black text for reader view in dark mode
          'text-secondary': '#9ca3af', // Gray-400
          'text-title': '#000000',     // Stone-100
          'metadata-bg': '#E8E8E0',    // White
          badge: '#374151',     // Gray-700
          callout: {
            pink: { bg: '#fce7f3', title: '#500724', body: '#831843' },
            blue: { bg: '#dbeafe', title: '#172554', body: '#1e3a8a' },
            orange: { bg: '#ffedd5', title: '#431407', body: '#7c2d12' },
            green: { bg: '#dcfce7', title: '#052e16', body: '#14532d' },
          }
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            // --- 1. 全局基调 ---
            '--tw-prose-body': '#292524',      // Stone-800
            '--tw-prose-headings': '#0c0a09',  // Stone-950
            '--tw-prose-links': '#c2410c',     // Orange-700
            '--tw-prose-bold': '#0c0a09',
            '--tw-prose-counters': '#57534e',
            '--tw-prose-bullets': '#a8a29e',   // Stone-400
            '--tw-prose-hr': '#e7e5e4',        // Stone-200
            '--tw-prose-quotes': '#44403c',
            '--tw-prose-quote-borders': '#f97316', // Orange-500

            // --- 2. 标题样式 ---
            'h1, h2, h3, h4': {
              fontFamily: theme('fontFamily.sans'),
              color: '#0c0a09',
              fontWeight: '800',
              letterSpacing: '-0.025em',
            },

            h2: {
              position: 'relative',
              fontSize: '1.6em',
              marginTop: '2em',
              marginBottom: '0.8em',
              paddingLeft: '0.75em',
              border: 'none',
              lineHeight: '1.3',
            },
            'h2::before': {
              content: '""',
              position: 'absolute',
              left: '0',
              top: '0.2em',
              bottom: '0.2em',
              width: '6px',
              borderRadius: '99px',
              backgroundColor: '#ea580c', // Orange-600
            },

            h3: {
              position: 'relative',
              fontSize: '1.25em',
              marginTop: '1.5em',
              marginBottom: '0.6em',
              fontWeight: '700',
              paddingLeft: '0.75em',
            },
            'h3::before': {
              content: '""',
              position: 'absolute',
              left: '0',
              top: '0.25em',
              bottom: '0.25em',
              width: '5px',
              borderRadius: '99px',
              backgroundColor: '#a8a29e', // Stone-400
            },

            // --- 3. 正文与列表 (紧凑模式) ---
            p: {
              marginTop: '0.2em',
              marginBottom: '0.6em',
              lineHeight: '1.6',
            },

            // 【新增】核心修复：隐藏所有空的 P 标签，解决莫名其妙的占高
            'p:empty': {
              display: 'none',
            },

            'ul, ol': {
              marginTop: '0.2em',
              marginBottom: '0.6em',
            },
            li: {
              marginTop: '0.2em',
              marginBottom: '0.2em',
            },

            // --- 4. 代码块 ---
            pre: {
              backgroundColor: '#0f172a', // Slate-900
              color: '#e2e8f0',           // Slate-200
              borderRadius: '0.5rem',
              padding: '1rem 1.25rem',
              border: '1px solid rgba(255,255,255,0.1)',
              marginTop: '1rem',
              marginBottom: '1rem',
              maxHeight: 'none',
              overflowY: 'visible',
            },
            'pre code': {
              backgroundColor: 'transparent',
              color: 'inherit',
              fontSize: '0.875em',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontWeight: '500',
            },

            // --- 5. 行内代码 ---
            code: {
              color: '#9a3412', // Orange-900
              backgroundColor: '#ffedd5', // Orange-100
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '600',
              fontFamily: 'monospace',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },

            // --- 6. 表格：【修改重点】 ---
            table: {
              width: '100%',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              borderCollapse: 'collapse',
              fontSize: '0.95em',
              backgroundColor: 'transparent', // 【修改】确保表格整体透明
              paddingLeft: '1rem',
            },
            thead: {
              backgroundColor: '#1b2a53a1', // 【修改】去掉原来的灰色背景，让底纹透出来
              borderBottom: '1px solid #1b2a53a1',
            },
            'thead th': {
              color: '#0c0a09',
              fontWeight: '700',
              padding: '0.75rem',
              paddingBottom: '0.4rem !important',
              textAlign: 'center !important',
              // 可以稍微把表头文字调大一点点，如果不喜欢可删掉这行
              fontSize: '1.05em',
            },
            'tbody tr': {
              borderBottom: '1px solid #e7e5e4',
            },
            'tbody td': {
              textAlign: 'center !important',
              padding: '0.75rem',
              color: '#44403c',
              verticalAlign: 'top', // 【建议】长文本顶部对齐更好看
            },

            // 【新增】核心修复：强制去掉表格内 P 标签的间距
            // 这里的优先级比上面的全局 p 更高，能完美解决表格被撑开的问题
            'tbody td p': {
              marginTop: '0',
              marginBottom: '0',
            },

            // --- 7. 引用块 ---
            blockquote: {
              fontStyle: 'normal',
              borderLeftColor: '#f97316', // Orange-500
              borderLeftWidth: '4px',
              backgroundColor: 'transparent',
              color: '#57534e',
              paddingLeft: '1.25rem',
              marginTop: '1rem',
              marginBottom: '1rem',
            },

            // --- 8. 斜体 ---
            'i, em': {
              fontStyle: 'italic',
            },

            a: {
              textDecoration: 'none',
              color: '#c2410c',
              borderBottom: '1px solid rgba(194, 65, 12, 0.3)',
              transition: 'border-color 0.2s',
              '&:hover': {
                borderBottomColor: '#c2410c',
              },
            },
          },
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.midnight.text-reader'),
            '--tw-prose-headings': theme('colors.midnight.text-reader'),
            '--tw-prose-lead': theme('colors.midnight.text-reader'),
            '--tw-prose-links': theme('colors.blue.600'), // Use slightly darker blue for better contrast on paper
            '--tw-prose-bold': theme('colors.midnight.text-reader'),
            '--tw-prose-counters': theme('colors.midnight.text-reader'),
            '--tw-prose-bullets': theme('colors.midnight.text-reader'),
            '--tw-prose-hr': theme('colors.gray.300'),
            '--tw-prose-quotes': theme('colors.midnight.text-reader'),
            '--tw-prose-quote-borders': theme('colors.midnight.text-reader'),
            '--tw-prose-captions': theme('colors.midnight.text-reader'),
            '--tw-prose-code': theme('colors.rose.600'),
            '--tw-prose-pre-code': theme('colors.midnight.text-reader'),
            '--tw-prose-pre-bg': theme('colors.gray.800'),
            '--tw-prose-th-borders': theme('colors.midnight.text-reader'),
            '--tw-prose-td-borders': theme('colors.midnight.text-reader'),
          },
        },
      }),
    },
  },

  plugins: [
    require('@tailwindcss/typography'),
  ],
}
