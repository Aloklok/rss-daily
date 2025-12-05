import React from 'react';
import { Article } from '../../types';
import { getRandomColorClass } from '../../utils/colorUtils';
import ArticleTitleStar from './ArticleTitleStar';
import ArticleActions from './ArticleActions';

// --- Helper Components & Constants ---

const CALLOUT_THEMES = {
    '一句话总结': { icon: '📝', color: 'pink' },
    '技术洞察': { icon: '🔬', color: 'blue' },
    '值得注意': { icon: '⚠️', color: 'brown' },
    '市场观察': { icon: '📈', color: 'green' }
} as const;

const calloutCardClasses = {
    pink: { bg: 'bg-pink-100 dark:bg-midnight-callout-pink-bg', title: 'text-pink-950 dark:text-midnight-callout-pink-title', body: 'text-pink-900 dark:text-midnight-callout-pink-body', emphasis: 'font-bold text-violet-700' },
    blue: { bg: 'bg-blue-100 dark:bg-midnight-callout-blue-bg', title: 'text-blue-950 dark:text-midnight-callout-blue-title', body: 'text-blue-900 dark:text-midnight-callout-blue-body', emphasis: 'font-bold text-violet-700' },
    brown: { bg: 'bg-orange-100 dark:bg-midnight-callout-orange-bg', title: 'text-orange-950 dark:text-midnight-callout-orange-title', body: 'text-orange-900 dark:text-midnight-callout-orange-body', emphasis: 'font-bold text-violet-700' },
    green: { bg: 'bg-green-100 dark:bg-midnight-callout-green-bg', title: 'text-green-950 dark:text-midnight-callout-green-title', body: 'text-green-900 dark:text-midnight-callout-green-body', emphasis: 'font-bold text-violet-700' }
};

const parseFormattedText = (text: string, emphasisClass: string = 'font-semibold text-current') => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
        if (i % 2 === 1) {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className={emphasisClass}>{part.slice(2, -2)}</strong>;
            } else if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="text-orange-900 bg-orange-100 px-1.5 py-0.5 rounded font-semibold font-mono text-[0.9em] mx-0.5">{part.slice(1, -1)}</code>;
            }
        }
        return part;
    });
};

interface CalloutProps { title: keyof typeof CALLOUT_THEMES; content: string; }
const Callout: React.FC<CalloutProps> = ({ title, content }) => {
    const theme = CALLOUT_THEMES[title];
    const colors = calloutCardClasses[theme.color];
    return (
        <aside className={`rounded-2xl p-6 ${colors.bg}`}>
            <div className="flex items-center gap-x-3 mb-3">
                <span className="text-2xl">{theme.icon}</span>
                <h4 className={`text-lg font-bold ${colors.title}`}>{title}</h4>
            </div>
            <div className={`${colors.body} text-[15px] leading-relaxed font-medium`}>
                {parseFormattedText(content, colors.emphasis)}
            </div>
        </aside>
    );
};

interface ArticleCardProps {
    article: Article;
    showActions?: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, showActions = true }) => {
    const publishedDate = new Date(article.published).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    const allKeywords = [...article.keywords];

    return (
        <article className="py-2 transition-opacity duration-300">
            <header className="mb-10">
                <h3 className="text-2xl lg:text-2xl font-bold font-serif text-stone-900 dark:text-midnight-text-title mb-6 leading-tight flex items-center gap-x-3">
                    <ArticleTitleStar article={article} />
                    <span>{article.title}</span>
                </h3>
                <div className="bg-gray-100 dark:bg-midnight-metadata-bg p-6 rounded-lg border border-gray-200 dark:border-midnight-badge space-y-3">
                    <div className="text-sm text-black flex items-center flex-wrap gap-x-4">
                        <span>{article.sourceName}</span>
                        <span>&bull;</span>
                        <span>发布于 {publishedDate}</span>
                    </div>
                    <div className="text-sm text-stone-600 flex items-center flex-wrap">
                        <span className="font-medium mr-2">{article.verdict.type}</span>
                        <span className="mr-2">&bull;</span>
                        <span className="font-medium mr-2">{article.category}</span>
                        <span className="mr-2">&bull;</span>
                        <span className={`font-semibold ${article.verdict.score >= 8 ? 'text-green-600' : article.verdict.score >= 6 ? 'text-amber-600' : 'text-red-600'}`}>
                            评分: {article.verdict.score}/10
                        </span>
                    </div>
                    {allKeywords && allKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {allKeywords.map(tag => (
                                <span key={tag} className={`text-xs font-semibold inline-block py-1 px-2.5 rounded-full ${getRandomColorClass(tag)}`}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <Callout title="一句话总结" content={article.summary || ''} />
                <Callout title="技术洞察" content={article.highlights} />
                <Callout title="值得注意" content={article.critiques} />
                <Callout title="市场观察" content={article.marketTake} />
            </div>

            {showActions && (
                <ArticleActions
                    article={article}
                />
            )}
        </article>
    );
};

export default ArticleCard;
