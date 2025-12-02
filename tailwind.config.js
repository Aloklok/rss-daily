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
    "!./api/**"
  ],
  theme: {
    extend: {
      backgroundImage: {
        'paper-texture': "url('/paper-texture.png')",
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
          '"Helvetica Neue"', 'Arial', '"Noto Sans"', '"PingFang SC"', '"Hiragino Sans GB"',
          '"Microsoft YaHei"', '"Noto Sans CJK SC"', 'sans-serif'
        ],
        serif: ['"Playfair Display"', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif']
      },
      colors: {
        midnight: {
          bg: '#F2F0E4',        // Slate-900 (Dark Blue)
          sidebar: '#2A2A4A',   // Gray-900
          card: '#1f2937',      // Gray-800
          selected: '#db2777',  // Pink-600
          border: '#1f2937',    // Gray-800
          'text-primary': '#000000',
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
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
