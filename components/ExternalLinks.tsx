// components/ExternalLinks.tsx

import React from 'react';

// 1. 定义配置类型 (新增 'orange')
type LinkTheme = 'teal' | 'indigo' | 'slate' | 'orange';

interface LinkConfig {
    id: string;
    title: string;
    url: string;
    theme: LinkTheme;
    iconPath: React.ReactNode;
}

// 2. 定义样式映射 (新增 orange 样式)
const THEME_STYLES: Record<LinkTheme, {
    text: string;
    icon: string;
    iconHover: string;
    border1: string;
    border2: string;
}> = {
    teal: {
        text: 'text-teal-600',
        icon: 'text-teal-700',
        iconHover: 'group-hover:text-teal-500',
        border1: 'border-gray-200',
        border2: 'border-gray-300',
    },
    indigo: {
        text: 'text-indigo-600',
        icon: 'text-indigo-700',
        iconHover: 'group-hover:text-indigo-500',
        border1: 'border-indigo-100',
        border2: 'border-indigo-200',
    },
    slate: {
        text: 'text-slate-700',
        icon: 'text-slate-800',
        iconHover: 'group-hover:text-slate-600',
        border1: 'border-slate-200',
        border2: 'border-slate-300',
    },
    orange: {
        text: 'text-orange-600',
        icon: 'text-orange-700',
        iconHover: 'group-hover:text-orange-500',
        border1: 'border-orange-100',
        border2: 'border-orange-200',
    }
};

// 3. 定义链接数据 (新增 Cloudflare Radar)
const LINKS: LinkConfig[] = [
    {
        id: 'notebooklm',
        title: 'NotebookLM',
        url: 'https://notebooklm.google.com/',
        theme: 'indigo',
        iconPath: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 00-1.423 1.423z" />
        )
    },
    {
        id: 'github-trending',
        title: 'GitHub Trending',
        url: 'https://github.com/trending',
        theme: 'slate',
        iconPath: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        )
    },
    {
        id: 'cloudflare-radar',
        title: 'Cloudflare Radar',
        url: 'https://radar.cloudflare.com/',
        theme: 'orange',
        iconPath: (
            // 地球图标，代表全球流量监控
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        )
    },
    {
        id: 'tech-radar',
        title: 'Thoughtworks Radar',
        url: 'https://www.thoughtworks.com/radar',
        theme: 'teal',
        iconPath: (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        )
    }
];

// 4. 单个卡片组件 (按单词维度智能缩放)
const LinkCard: React.FC<{ config: LinkConfig }> = ({ config }) => {
    const styles = THEME_STYLES[config.theme];
    const words = config.title.split(' ');

    return (
        <a
            href={config.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 p-0.5 transition-all duration-300 no-underline hover:shadow-md"
        >
            <div className="relative h-full min-h-[50px] w-full rounded-[10px] bg-white px-2.5 py-2 overflow-hidden">
                {/* 背景装饰保持不变 */}
                <div className={`absolute -right-3 -top-3 h-16 w-16 md:-right-4 md:-top-4 md:h-12 md:w-12 rounded-full border ${styles.border1} opacity-60 group-hover:scale-150 transition-transform duration-700 ease-out pointer-events-none`}></div>
                <div className={`absolute -right-3 -top-3 h-16 w-16 md:-right-4 md:-top-4 md:h-12 md:w-12 rounded-full border ${styles.border2} opacity-0 group-hover:opacity-30 group-hover:animate-ping transition-opacity duration-300 pointer-events-none`}></div>

                <div className="relative z-10 flex items-center justify-between w-full h-full gap-1">
                    {/* 文字区域 */}
                    <div className="flex-1 flex flex-wrap items-center content-center min-w-0 leading-none">
                        {words.map((word, index) => {
                            // --- 修正逻辑 ---
                            // 只有超过 10 个字符的词（例如 Thoughtworks）才会被视为长词
                            // NotebookLM (10字符) 会被视为普通词，保持原样
                            const isLongWord = word.length > 10;

                            return (
                                <span
                                    key={index}
                                    className={`
                                        font-bold uppercase break-all
                                        ${styles.text}
                                        /* 长词(>10): 9px + 紧凑 */
                                        /* 正常词(<=10): 11px + 宽松 */
                                        ${isLongWord ? 'text-[9px] tracking-tighter' : 'text-[11px] tracking-wider'}
                                        ${index < words.length - 1 ? 'mr-1' : ''}
                                    `}
                                >
                                    {word}
                                </span>
                            );
                        })}
                    </div>

                    {/* 图标区域 */}
                    <div className={`flex-none -mr-0.5 ${styles.icon} ${styles.iconHover} transition-colors`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            {config.iconPath}
                        </svg>
                    </div>
                </div>
            </div>
        </a>
    );
};

// 5. 导出主组件
const ExternalLinks: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 px-1">
            {LINKS.map(link => (
                <LinkCard key={link.id} config={link} />
            ))}
        </div>
    );
};

export default ExternalLinks;