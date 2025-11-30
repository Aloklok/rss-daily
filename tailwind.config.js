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
          bg: '#191724',        // Deep Violet-Black
          sidebar: '#111827',   // Gray-900
          card: '#1f2937',      // Gray-800
          selected: '#db2777',  // Pink-600
          border: '#1f2937',    // Gray-800
          'text-primary': '#ffffff',
          'text-secondary': '#9ca3af', // Gray-400
          badge: '#374151',     // Gray-700
          callout: {
            pink: { bg: '#291d24', title: '#eecddf', body: '#dcb5c9' },
            blue: { bg: '#1d2229', title: '#cde1ee', body: '#b5cbdc' },
            orange: { bg: '#29221d', title: '#eeddcd', body: '#dcc7b5' },
            green: { bg: '#1d2922', title: '#cdeed6', body: '#b5dcb9' },
          }
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
