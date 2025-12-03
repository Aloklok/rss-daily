// components/Briefing.tsx

import React, { useMemo, memo } from 'react';
import { Article, BriefingReport, Tag, Filter, GroupedArticles } from '../types';
import ArticleGroup from './ArticleGroup';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';
import LoadingSpinner from './LoadingSpinner';

interface ReportContentProps {
    report: BriefingReport;
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
}

const ReportContent: React.FC<ReportContentProps> = memo(({ report, onReaderModeRequest, onStateChange }) => {
    const importanceOrder = ['重要新闻', '必知要闻', '常规更新'];

    const handleJump = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const allArticlesCount = Object.values(report.articles).reduce((acc, articles) => acc + articles.length, 0);

    if (allArticlesCount === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-2xl font-semibold text-stone-600">此时间段内暂无文章。</p>
            </div>
        );
    }

    return (
        <div>
            {/* Table of Contents & Summary Section */}
            <div className="bg-white/70 backdrop-blur-md px-2 py-2 rounded-2xl border border-stone-200/80 shadow-sm mb-10">
                <div className="md:hidden">
                    <h3 className="text-2xl font-bold font-serif text-stone-800 flex items-center">
                        <span>📚 目录</span>
                        <span className="text-stone-400 mx-2 font-light">/</span>
                        <span>📝 摘要</span>
                    </h3>
                </div>
                <div className="hidden md:grid grid-cols-2 gap-x-6">
                    <h3 className="text-2xl font-bold font-serif text-stone-800">📚 目录</h3>
                    <h3 className="text-2xl font-bold font-serif text-stone-800">📝 摘要</h3>
                </div>

                <div className="mt-3">
                    {importanceOrder.map(importance => {
                        const articles = report.articles[importance];
                        if (!articles || articles.length === 0) return null;
                        const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;
                        return (
                            <div key={importance}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 border-b-2 border-stone-200 my-0 pb-0.5">
                                    <div className="py-0.5">
                                        <a href={`#${sectionId}`} onClick={(e) => handleJump(e, sectionId)} className="font-semibold text-base text-rose-800 hover:underline">
                                            <span className="mr-2"></span>
                                            {importance}
                                        </a>
                                    </div>
                                    <div className="hidden md:block py-2"></div>
                                </div>
                                {articles.map(article => (
                                    <div key={article.id}>
                                        <div className="md:hidden py-3">
                                            <a href={`#article-${article.id}`} onClick={(e) => handleJump(e, `article-${article.id}`)} className="text-sky-600 hover:text-sky-800 font-medium leading-tight">
                                                {article.title}
                                            </a>
                                            <p className="mt-2 text-base text-stone-600 leading-relaxed">{article.tldr}</p>
                                        </div>
                                        <div className="hidden md:grid grid-cols-2 gap-x-6">
                                            <div className="py-2 flex items-start">
                                                <a href={`#article-${article.id}`} onClick={(e) => handleJump(e, `article-${article.id}`)} className="text-sky-600 hover:text-sky-800 hover:underline font-medium leading-tight decoration-sky-300 decoration-2">
                                                    {article.title}
                                                </a>
                                            </div>
                                            <div className="py-2 text-base text-stone-600 leading-relaxed flex items-start">{article.tldr}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Articles Section - Now uses ArticleGroup */}
            <div className="">
                {importanceOrder.map(importance => (
                    <ArticleGroup
                        key={importance}
                        importance={importance}
                        articles={report.articles[importance]}
                        onReaderModeRequest={onReaderModeRequest}
                        onStateChange={onStateChange}
                    />
                ))}
            </div>
        </div>
    );
});
ReportContent.displayName = 'ReportContent';

interface BriefingProps {
    articleIds: (string | number)[]; // 【修改】只接收 IDs
    timeSlot: 'morning' | 'afternoon' | 'evening' | null;
    selectedReportId: number | null;
    onReportSelect: (id: number) => void;
    onReaderModeRequest: (article: Article) => void;
    onStateChange: (articleId: string | number, tagsToAdd: string[], tagsToRemove: string[]) => Promise<void>;
    onTimeSlotChange: (slot: 'morning' | 'afternoon' | 'evening' | null) => void;
    isSidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    articleCount: number;
    isLoading?: boolean;
}

import { getRandomGradient } from '../utils/colorUtils';

const Briefing: React.FC<BriefingProps> = ({ articleIds, timeSlot, selectedReportId, onReportSelect, onReaderModeRequest, onStateChange, onTimeSlotChange, isSidebarCollapsed, onToggleSidebar, articleCount, isLoading }) => {
    // 1. 【新增】内部订阅文章数据
    const articlesById = useArticleStore(state => state.articlesById);
    const activeFilter = useUIStore(state => state.activeFilter);

    // 2. 【新增】内部生成 reports
    const reports: BriefingReport[] = useMemo(() => {
        if (!articleIds || articleIds.length === 0) return [];
        const articlesForReport = articleIds.map(id => articlesById[id]).filter(Boolean) as Article[];
        const groupedArticles = articlesForReport.reduce((acc, article) => {
            const group = article.briefingSection || '常规更新';
            if (!acc[group]) acc[group] = [];
            acc[group].push(article);
            return acc;
        }, {} as GroupedArticles);
        return [{ id: 1, title: "Daily Briefing", articles: groupedArticles }];
    }, [articleIds, articlesById]);

    const selectedReport = reports.find(r => r.id === selectedReportId);

    const randomGradient = useMemo(() => {
        if (activeFilter?.type !== 'date') return getRandomGradient('default');
        // Use the full date string as the key to ensure different gradients for different days
        // but consistent for the same day
        return getRandomGradient(activeFilter.value);
    }, [activeFilter]);

    const isToday = useMemo(() => {
        if (activeFilter?.type !== 'date') return false;
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayLocal = `${y}-${m}-${d}`;
        return activeFilter.value === todayLocal;
    }, [activeFilter]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 0 && hour < 5) return '凌晨好';
        if (hour >= 5 && hour < 12) return '早上好';
        if (hour >= 12 && hour < 14) return '中午好';
        if (hour >= 14 && hour < 18) return '下午好';
        if (hour >= 18 && hour < 22) return '傍晚好';
        return '晚上好';
    }

    const renderHeader = () => {
        if (activeFilter?.type === 'date') {
            const dateObj = new Date(activeFilter.value + 'T00:00:00');
            const datePart = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
            const weekdayPart = dateObj.toLocaleDateString('zh-CN', { weekday: 'long' });

            // Use the date string as a seed for the random image to ensure it stays the same for that date
            const seed = activeFilter.value;
            const bgImage = `https://picsum.photos/seed/${seed}/800/400`;

            const now = new Date();
            const currentHour = now.getHours();

            const getCurrentTimeSlot = () => {
                if (currentHour >= 0 && currentHour < 12) return 'morning';
                if (currentHour >= 12 && currentHour < 19) return 'afternoon';
                return 'evening';
            };
            const autoSelectedSlot = isToday ? getCurrentTimeSlot() : null;

            return (
                <header className="relative mb-8 overflow-hidden rounded-2xl shadow-md transition-all duration-500 hover:shadow-xl group">
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src={bgImage}
                            alt="Daily Background"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Dark Gradient Overlay for Text Readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30"></div>


                    </div>

                    <div className="relative z-10 p-6 md:p-8 flex flex-col gap-8">

                        {/* Top Row: Date & Time Slot Selector */}
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                            {/* Left: Date - Structured Layout (White Text) */}
                            <div className="flex flex-col gap-2 text-white">
                                <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight leading-none drop-shadow-md mb-2">
                                    {isToday ? '今天' : datePart}
                                </h1>
                                <div className="flex items-center gap-2 text-sm md:text-base text-white/95 drop-shadow-sm bg-white/20 px-4 py-1.5 rounded-full self-start">
                                    {isToday && (
                                        <>
                                            <span>{datePart}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/60"></span>
                                        </>
                                    )}
                                    <span>{weekdayPart}</span>
                                </div>
                            </div>

                            {/* Right: Time Slot Selector - More Visible */}
                            {/* Right: Time Slot Selector - Circular Design */}
                            {activeFilter?.type === 'date' && (
                                <div className="flex items-center gap-3 self-start">
                                    {(['morning', 'afternoon', 'evening'] as const).map(slotOption => {
                                        const labelMap: Record<'morning' | 'afternoon' | 'evening', string> = { morning: '早', afternoon: '中', evening: '晚' };
                                        const isSelected = timeSlot === slotOption || (timeSlot === null && autoSelectedSlot === slotOption);

                                        return (
                                            <button
                                                key={slotOption}
                                                onClick={() => onTimeSlotChange(isSelected ? null : slotOption)}
                                                className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif transition-all duration-300 border border-white/20
                                                    ${isSelected
                                                        ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110 border-white dark:bg-amber-100 dark:text-amber-900 dark:shadow-[0_0_15px_rgba(251,191,36,0.6)] dark:border-amber-100'
                                                        : 'bg-black/20 text-white/90 hover:bg-white/20 hover:border-white/40 backdrop-blur-md'
                                                    }
                                                `}
                                                title={slotOption === 'morning' ? '早上' : slotOption === 'afternoon' ? '中午' : '晚上'}
                                            >
                                                {labelMap[slotOption]}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Bottom Row: Greeting & Count - Unified (White Text) with Separator */}
                        <div className="pt-4 border-t border-white/20">
                            <p className="text-base md:text-lg text-white/95 leading-relaxed font-serif drop-shadow-sm">
                                {isToday ? (
                                    <span>{getGreeting()}，欢迎阅读今日简报</span>
                                ) : (
                                    <span>欢迎阅读本期简报</span>
                                )}
                                {articleCount > 0 && <span>，共 {articleCount} 篇文章。</span>}
                            </p>
                        </div>
                    </div>
                </header>
            );
        }
        return null;
    }

    return (
        <main className="flex-1 px-2 py-2 md:p-8 lg:p-10">
            <div className="max-w-6xl mx-auto">
                {renderHeader()}

                {isLoading ? (
                    <div className="py-20 h-64">
                        <LoadingSpinner />
                    </div>
                ) : reports.length > 0 ? (
                    <div className="space-y-10">
                        {reports.map(report => (
                            <ReportContent
                                key={report.id}
                                report={report}
                                onReaderModeRequest={onReaderModeRequest}
                                onStateChange={onStateChange}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-2xl font-semibold text-stone-600">
                            {isToday
                                ? '暂无简报，请稍后查看。'
                                : '该日期下没有简报。'
                            }
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default memo(Briefing);