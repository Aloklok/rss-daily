import React from 'react';
import ReloadPWAButton from '@/domains/reading/components/Sidebar/ReloadPWAButton';

// 1. 定义配置类型
type LinkTheme =
  | 'teal'
  | 'indigo'
  | 'slate'
  | 'orange'
  | 'blue'
  | 'purple'
  | 'yellow'
  | 'red'
  | 'pink'
  | 'green'
  | 'cyan';

interface LinkConfig {
  id: string;
  title: string;
  url: string;
  theme: LinkTheme;
  iconPath: React.ReactNode;
  category: string; // 新增分类字段
}

// 2. 定义样式映射
const THEME_STYLES: Record<
  LinkTheme,
  {
    text: string;
    icon: string;
    iconHover: string;
    border1: string;
    border2: string;
    bg: string;
  }
> = {
  teal: {
    text: 'text-teal-700 dark:text-teal-800',
    icon: 'text-teal-800 dark:text-teal-700',
    iconHover: 'group-hover:text-teal-500 dark:group-hover:text-teal-600',
    border1: 'border-teal-200 dark:border-teal-200',
    border2: 'border-teal-300 dark:border-teal-300',
    bg: 'bg-teal-50/50 dark:bg-teal-100',
  },
  indigo: {
    text: 'text-indigo-700 dark:text-indigo-800',
    icon: 'text-indigo-800 dark:text-indigo-700',
    iconHover: 'group-hover:text-indigo-500 dark:group-hover:text-indigo-600',
    border1: 'border-indigo-200 dark:border-indigo-200',
    border2: 'border-indigo-300 dark:border-indigo-300',
    bg: 'bg-indigo-50/50 dark:bg-indigo-100',
  },
  slate: {
    text: 'text-slate-700 dark:text-slate-800',
    icon: 'text-slate-800 dark:text-slate-700',
    iconHover: 'group-hover:text-slate-500 dark:group-hover:text-slate-600',
    border1: 'border-slate-200 dark:border-slate-200',
    border2: 'border-slate-300 dark:border-slate-300',
    bg: 'bg-slate-50/50 dark:bg-slate-100',
  },
  orange: {
    text: 'text-orange-700 dark:text-orange-800',
    icon: 'text-orange-800 dark:text-orange-700',
    iconHover: 'group-hover:text-orange-500 dark:group-hover:text-orange-600',
    border1: 'border-orange-200 dark:border-orange-200',
    border2: 'border-orange-300 dark:border-orange-300',
    bg: 'bg-orange-50/50 dark:bg-orange-100',
  },
  blue: {
    text: 'text-blue-700 dark:text-blue-800',
    icon: 'text-blue-800 dark:text-blue-700',
    iconHover: 'group-hover:text-blue-500 dark:group-hover:text-blue-600',
    border1: 'border-blue-200 dark:border-blue-200',
    border2: 'border-blue-300 dark:border-blue-300',
    bg: 'bg-blue-50/50 dark:bg-blue-100',
  },
  purple: {
    text: 'text-purple-700 dark:text-purple-800',
    icon: 'text-purple-800 dark:text-purple-700',
    iconHover: 'group-hover:text-purple-500 dark:group-hover:text-purple-600',
    border1: 'border-purple-200 dark:border-purple-200',
    border2: 'border-purple-300 dark:border-purple-300',
    bg: 'bg-purple-50/50 dark:bg-purple-100',
  },
  yellow: {
    text: 'text-yellow-700 dark:text-yellow-800',
    icon: 'text-yellow-800 dark:text-yellow-700',
    iconHover: 'group-hover:text-yellow-500 dark:group-hover:text-yellow-600',
    border1: 'border-yellow-200 dark:border-yellow-200',
    border2: 'border-yellow-300 dark:border-yellow-300',
    bg: 'bg-yellow-50/50 dark:bg-yellow-100',
  },
  red: {
    text: 'text-red-700 dark:text-red-800',
    icon: 'text-red-800 dark:text-red-700',
    iconHover: 'group-hover:text-red-500 dark:group-hover:text-red-600',
    border1: 'border-red-200 dark:border-red-200',
    border2: 'border-red-300 dark:border-red-300',
    bg: 'bg-red-50/50 dark:bg-red-100',
  },
  pink: {
    text: 'text-pink-700 dark:text-pink-800',
    icon: 'text-pink-800 dark:text-pink-700',
    iconHover: 'group-hover:text-pink-500 dark:group-hover:text-pink-600',
    border1: 'border-pink-200 dark:border-pink-200',
    border2: 'border-pink-300 dark:border-pink-300',
    bg: 'bg-pink-50/50 dark:bg-pink-100',
  },
  green: {
    text: 'text-green-700 dark:text-green-800',
    icon: 'text-green-800 dark:text-green-700',
    iconHover: 'group-hover:text-green-500 dark:group-hover:text-green-600',
    border1: 'border-green-200 dark:border-green-200',
    border2: 'border-green-300 dark:border-green-300',
    bg: 'bg-green-50/50 dark:bg-green-100',
  },
  cyan: {
    text: 'text-cyan-700 dark:text-cyan-800',
    icon: 'text-cyan-800 dark:text-cyan-700',
    iconHover: 'group-hover:text-cyan-500 dark:group-hover:text-cyan-600',
    border1: 'border-cyan-200 dark:border-cyan-200',
    border2: 'border-cyan-300 dark:border-cyan-300',
    bg: 'bg-cyan-50/50 dark:bg-cyan-100',
  },
};

// 3. 定义链接数据
const LINKS: LinkConfig[] = [
  // --- 工具 ---
  {
    id: 'notebooklm',
    title: 'NotebookLM',
    url: 'https://notebooklm.google.com/',
    theme: 'indigo',
    category: '工具',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 00-1.423 1.423z"
      />
    ),
  },
  {
    id: 'huggingface',
    title: 'Hugging Face',
    url: 'https://huggingface.co/collections',
    theme: 'yellow',
    category: '工具',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
      />
    ),
  },

  // --- 趋势 ---
  {
    id: 'github-trending',
    title: 'GitHub Trending',
    url: 'https://github.com/trending',
    theme: 'slate',
    category: '趋势',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
      />
    ),
  },
  {
    id: 'bestofjs',
    title: 'Best of JS',
    url: 'https://bestofjs.org/trends/monthly',
    theme: 'yellow',
    category: '趋势',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    ),
  },
  {
    id: 'tiobe-index',
    title: 'TIOBE Index',
    url: 'https://www.tiobe.com/tiobe-index/',
    theme: 'green',
    category: '趋势',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  },
  {
    id: 'cloudflare-radar',
    title: 'Cloudflare Radar',
    url: 'https://radar.cloudflare.com/',
    theme: 'orange',
    category: '趋势',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    ),
  },
  {
    id: 'tech-radar',
    title: 'Thoughtworks Radar',
    url: 'https://www.thoughtworks.com/radar',
    theme: 'pink',
    category: '趋势',
    iconPath: <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />,
  },
  {
    id: 'srg-research',
    title: 'SRG Research',
    url: 'https://www.srgresearch.com/research',
    theme: 'teal',
    category: '趋势',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    ),
  },

  {
    id: 'chatbot-arena',
    title: 'Chatbot Arena',
    url: 'https://lmarena.ai/leaderboard',
    theme: 'purple',
    category: '趋势',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.546a6.003 6.003 0 01-5.364 4.973m0 0a6.726 6.726 0 01-2.749 1.35"
      />
    ),
  },

  // --- 数据库 ---
  {
    id: 'db-rank',
    title: 'moDB 墨天轮',
    url: 'https://www.modb.pro/dbRank',
    theme: 'blue',
    category: '数据库',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    ),
  },
  {
    id: 'db-engines',
    title: 'DB Engines',
    url: 'https://db-engines.com/en/ranking',
    theme: 'red',
    category: '数据库',
    iconPath: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
      />
    ),
  },
];

// 4. 单个卡片组件
const LinkCard: React.FC<{ config: LinkConfig }> = ({ config }) => {
  const styles = THEME_STYLES[config.theme];

  return (
    <a
      href={config.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block h-full overflow-hidden rounded-lg no-underline transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`relative flex h-full w-full items-center gap-3 overflow-hidden rounded-lg border px-3 py-3 transition-colors duration-300 ${styles.bg} ${styles.border1} dark:group-hover:bg-midnight-metadata-bg`}
      >
        {/* 背景装饰 */}
        <div
          className={`absolute -top-3 -right-3 h-16 w-16 rounded-full border ${styles.border2} pointer-events-none opacity-20 transition-transform duration-500 ease-out group-hover:scale-150`}
        ></div>

        {/* 图标区域 */}
        <div
          className={`flex-none ${styles.icon} ${styles.iconHover} rounded-md p-1.5 transition-colors`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            {config.iconPath}
          </svg>
        </div>

        {/* 文字区域 - 确保全部显示 */}
        <div className="relative z-10 min-w-0 flex-1">
          <h3
            className={`text-sm font-bold ${styles.text} transition-opacity group-hover:opacity-80`}
          >
            {config.title}
          </h3>
        </div>

        {/* 外部链接箭头 */}
        <div
          className={`flex-none -translate-x-2 text-gray-400 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 dark:text-gray-500`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </a>
  );
};

// 5. 导出主组件
const TrendsView: React.FC = () => {
  // 按分类分组
  const groupedLinks = LINKS.reduce(
    (acc, link) => {
      if (!acc[link.category]) {
        acc[link.category] = [];
      }
      acc[link.category].push(link);
      return acc;
    },
    {} as Record<string, LinkConfig[]>,
  );

  // 定义分类顺序
  const categoryOrder = ['工具', '趋势', '数据库'];

  // 分类配置
  const CATEGORY_CONFIG: Record<string, { accent: string; text: string }> = {
    工具: {
      accent: 'bg-indigo-600',
      text: 'text-gray-900 dark:text-midnight-text-primary',
    },
    趋势: {
      accent: 'bg-orange-600',
      text: 'text-gray-900 dark:text-midnight-text-primary',
    },
    数据库: {
      accent: 'bg-blue-600',
      text: 'text-gray-900 dark:text-midnight-text-primary',
    },
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-12">
        <h2 className="dark:text-midnight-text-primary text-3xl font-bold tracking-tight text-gray-900">
          趋势工具
        </h2>
        <p className="dark:text-midnight-text-secondary mt-2 text-gray-500">
          探索最新的技术趋势和行业动态
        </p>
      </div>

      <div className="space-y-12">
        {categoryOrder.map((category) => {
          const links = groupedLinks[category];
          const config = CATEGORY_CONFIG[category];
          if (!links) return null;

          return (
            <div key={category}>
              <div className="mb-6 flex items-center">
                <div className={`h-7 w-1.5 rounded-full ${config.accent} mr-3 shadow-xs`}></div>
                <h3 className={`text-xl font-bold ${config.text} tracking-wide`}>{category}</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {links.map((link) => (
                  <LinkCard key={link.id} config={link} />
                ))}
              </div>
            </div>
          );
        })}
        <div className="mt-12 flex justify-center pb-8">
          <ReloadPWAButton />
        </div>
      </div>
    </div>
  );
};

export default TrendsView;
