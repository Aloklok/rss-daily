// components/Briefing.tsx

import React, { useMemo, memo } from 'react';
import { Article, BriefingReport, GroupedArticles, TimeSlot } from '@/shared/types';
import { useArticleStore } from '@/domains/interaction/store/articleStore';
import LoadingSpinner from '@/shared/ui/Spinner';
import Image from 'next/image';
import Link from 'next/link';

import { BRIEFING_IMAGE_WIDTH, BRIEFING_IMAGE_HEIGHT, BRIEFING_SECTIONS } from '../../constants';
import ArticleGroup from './BriefGroup';
import { getShanghaiHour } from '@/domains/reading/utils/date';
import { Dictionary } from '@/app/i18n/dictionaries';

interface ReportContentProps {
  report: BriefingReport;
  onReaderModeRequest: (article: Article) => void;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<void>;
  dict: Dictionary;
}

const ReportContent: React.FC<ReportContentProps> = memo(
  ({ report, onReaderModeRequest, onStateChange, dict }) => {
    const importanceOrder = [
      BRIEFING_SECTIONS.IMPORTANT,
      BRIEFING_SECTIONS.MUST_KNOW,
      BRIEFING_SECTIONS.REGULAR,
    ];

    const importanceLabels: Record<string, string> = {
      [BRIEFING_SECTIONS.IMPORTANT]: dict.briefing.sections.important,
      [BRIEFING_SECTIONS.MUST_KNOW]: dict.briefing.sections.mustKnow,
      [BRIEFING_SECTIONS.REGULAR]: dict.briefing.sections.regular,
    };

    const handleJump = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        // Buffer for sticky headers (Importance Header + potentially Navbar)
        const headerOffset = 50;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    };

    const allArticlesCount = Object.values(report.articles).reduce(
      (acc, articles) => acc + articles.length,
      0,
    );

    if (allArticlesCount === 0) {
      return (
        <div className="py-20 text-center">
          <p className="text-2xl font-semibold text-stone-600">{dict.briefing.empty.noData}</p>
        </div>
      );
    }

    return (
      <div>
        {/* Table of Contents & Summary Section */}
        <div className="mb-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/50 transition-all duration-500 hover:shadow-xl hover:shadow-stone-200/60 md:mb-10 dark:border-white/10 dark:bg-gray-900 dark:shadow-none">
          <div className="md:hidden">
            <h2 className="flex items-center font-serif text-lg font-bold text-stone-800 dark:text-white">
              <span>📚 {dict.briefing.navigation.toc}</span>
              <span className="mx-2 font-light text-stone-400">/</span>
              <span>📝 {dict.briefing.navigation.summary}</span>
            </h2>
          </div>
          <div className="hidden grid-cols-2 gap-x-6 md:grid">
            <h2 className="font-serif text-lg font-bold text-stone-800 dark:text-white">
              📚 {dict.briefing.navigation.toc}
            </h2>
            <h2 className="font-serif text-lg font-bold text-stone-800 dark:text-white">
              📝 {dict.briefing.navigation.summary}
            </h2>
          </div>

          <div className="mt-3">
            {importanceOrder.map((importance) => {
              const articles = report.articles[importance];
              if (!articles || articles.length === 0) return null;
              const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;
              return (
                <div key={importance}>
                  <div className="my-0 grid grid-cols-1 gap-x-6 border-b border-stone-200 pb-0.5 md:grid-cols-2 dark:border-white/10">
                    <div className="py-0.5">
                      <a
                        href={`#${sectionId}`}
                        onClick={(e) => handleJump(e, sectionId)}
                        className="text-sm font-semibold text-rose-800 hover:underline dark:text-rose-400"
                      >
                        <span className="mr-2"></span>
                        {importanceLabels[importance] || importance}
                      </a>
                    </div>
                    <div className="hidden py-2 md:block"></div>
                  </div>
                  {articles.map((article) => (
                    <div key={article.id}>
                      <div className="py-3 md:hidden">
                        <a
                          href={`#article-${article.id}`}
                          onClick={(e) => handleJump(e, `article-${article.id}`)}
                          className="text-sm leading-tight font-medium text-sky-600 hover:text-blue-300 dark:text-blue-400 dark:hover:text-sky-200"
                        >
                          {article.title}
                        </a>
                        <p className="mt-2 text-sm leading-tight text-stone-600 dark:text-gray-50">
                          {article.tldr}
                        </p>
                      </div>
                      <div className="hidden grid-cols-2 gap-x-6 md:grid">
                        <div className="flex items-start py-2">
                          <a
                            href={`#article-${article.id}`}
                            onClick={(e) => handleJump(e, `article-${article.id}`)}
                            className="text-sm leading-tight font-medium text-sky-600 decoration-sky-300 decoration-2 hover:text-blue-300 hover:underline dark:text-blue-400 dark:hover:text-sky-200"
                          >
                            {article.title}
                          </a>
                        </div>
                        <div className="flex items-start py-2 text-sm leading-tight text-stone-600 dark:text-gray-50">
                          {article.tldr}
                        </div>
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
          {importanceOrder.map((importance) => (
            <ArticleGroup
              key={importance}
              importance={importance}
              articles={report.articles[importance]}
              onReaderModeRequest={onReaderModeRequest}
              onStateChange={onStateChange}
              dict={dict}
            />
          ))}
        </div>
      </div>
    );
  },
);
ReportContent.displayName = 'ReportContent';

interface BriefingProps {
  articleIds: (string | number)[];
  date: string; // 【新增】接收日期
  timeSlot: TimeSlot | null;
  selectedReportId: number | null;
  onReportSelect: (id: number) => void;
  onReaderModeRequest: (article: Article) => void;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<void>;
  onTimeSlotChange: (slot: TimeSlot | null) => void;
  articleCount: number;
  isLoading?: boolean;

  headerImageUrl?: string; // 【新增】接收预解析的图片 URL
  articles?: Article[]; // 【新增】用于 SSR/Hydration 的初始文章数据
  isToday: boolean;
  prevDate?: string | null;
  nextDate?: string | null;
  verdictFilter?: string | null;
  onVerdictFilterChange?: (type: string | null) => void;
  dict: Dictionary;
}

const Briefing: React.FC<BriefingProps> = ({
  articleIds,
  date,
  timeSlot,
  selectedReportId: _selectedReportId,
  onReportSelect: _onReportSelect,
  onReaderModeRequest,
  onStateChange,
  onTimeSlotChange,
  articleCount: _articleCount,
  isLoading,
  headerImageUrl,
  articles,
  isToday,
  prevDate,
  nextDate,
  verdictFilter,
  onVerdictFilterChange,
  dict,
}) => {
  // 1. 【新增】内部订阅文章数据
  const articlesById = useArticleStore((state) => state.articlesById);
  // const activeFilter = useUIStore(state => state.activeFilter); // No longer needed for date logic

  // 2. 【新增】内部生成 reports
  // 关键: 优先使用 props 中的 articles (来自 SSR,已合并 initialArticleStates)
  // 然后用 Store 中的 tags 覆盖 (用于响应用户交互后的状态更新)
  const reports: BriefingReport[] = useMemo(() => {
    if (!articleIds || articleIds.length === 0) return [];
    const articlesForReport = articleIds
      .map((id) => {
        // 优先从 props 查找 (SSR 数据,包含正确的初始状态)
        const propsArticle = articles?.find((a) => String(a.id) === String(id));
        const storeArticle = articlesById[String(id)];

        if (propsArticle) {
          // Robust Merge: Start with SSR data, but let Store data (AI updates, tags) win.
          // This ensures that 'summary', 'tldr', 'verdict', etc. update live after regeneration.
          return { ...propsArticle, ...storeArticle };
        }
        // Fallback 到 Store (用于动态加载的文章)
        return storeArticle;
      })
      .filter(Boolean);
    const groupedArticles = articlesForReport.reduce((acc, article) => {
      let group = article.briefingSection || BRIEFING_SECTIONS.REGULAR;

      // Sanitize: If group is not one of the known sections, force it to REGULAR
      // This prevents articles with unknown sections (e.g. from older data or AI errors) from being hidden
      const validSections = Object.values(BRIEFING_SECTIONS) as string[];
      if (!validSections.includes(group)) {
        group = BRIEFING_SECTIONS.REGULAR;
      }

      if (!acc[group]) acc[group] = [];
      acc[group].push(article);
      return acc;
    }, {} as GroupedArticles);
    return [{ id: 1, title: 'Daily Briefing', articles: groupedArticles }];
  }, [articleIds, articlesById, articles]);

  // Image fallback state must be at the top level of the component to follow Hook rules
  const seed = date;
  const initialBgImage =
    headerImageUrl ||
    `https://picsum.photos/seed/${seed}/${BRIEFING_IMAGE_WIDTH}/${BRIEFING_IMAGE_HEIGHT}`;
  const [imgSrc, setImgSrc] = React.useState(initialBgImage);

  // Sync image when headerImageUrl or date changes (though key={date} usually handles this via remount)
  React.useEffect(() => {
    setImgSrc(initialBgImage);
  }, [initialBgImage]);

  // Use null as initial state to ensure SSR/Hydration consistency.
  // The first render will use the server-provided Shanghai hour (via getGreeting fallback or null).
  const [currentHour, setCurrentHour] = React.useState<number | null>(null);

  React.useEffect(() => {
    // After mount, set correct local hour to trigger a safe client-side update
    setCurrentHour(new Date().getHours());
  }, []);

  const getGreeting = () => {
    const hour = currentHour ?? getShanghaiHour();
    if (hour >= 23 || hour < 3) return dict.briefing.greetings.lateNight;
    if (hour >= 3 && hour < 5) return dict.briefing.greetings.earlyMorning;
    if (hour >= 5 && hour < 9) return dict.briefing.greetings.morning;
    if (hour >= 9 && hour < 11) return dict.briefing.greetings.midMorning;
    if (hour >= 11 && hour < 14) return dict.briefing.greetings.noon;
    if (hour >= 14 && hour < 17) return dict.briefing.greetings.afternoon;
    if (hour >= 17 && hour < 19) return dict.briefing.greetings.evening;
    return dict.briefing.greetings.night;
  };

  const renderHeader = () => {
    if (date) {
      const dateObj = new Date(date + 'T00:00:00');
      const locale = dict.lang === 'zh' ? 'zh-CN' : 'en-US';
      const datePart = dateObj.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
      const weekdayPart = dateObj.toLocaleDateString(locale, { weekday: 'long' });

      return (
        <header className="group relative mb-5 overflow-hidden rounded-2xl shadow-md transition-all duration-500 hover:shadow-xl md:mb-8">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src={imgSrc}
              alt={dict.briefing.header.coverAlt}
              fill
              priority
              fetchPriority="high"
              unoptimized={process.env.NODE_ENV === 'development'}
              sizes="(max-width: 768px) 100vw, (max-width: 1536px) 80vw, 1152px"
              className="object-cover transition-transform duration-700 will-change-transform backface-hidden group-hover:scale-105"
              onError={() => {
                const fallback = `https://picsum.photos/seed/${seed}/${BRIEFING_IMAGE_WIDTH}/${BRIEFING_IMAGE_HEIGHT}.webp`;
                if (imgSrc !== fallback) {
                  console.warn(`[Image] Cover 404 for ${date}, falling back to Picsum.`);
                  setImgSrc(fallback);
                }
              }}
            />
            {/* Dark Gradient Overlay for Text Readability: Adjusted to be lighter (Moderate) */}
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/10"></div>
          </div>

          <div className="relative z-10 flex flex-col gap-4 px-6 py-5 md:gap-8 md:px-8 md:py-11">
            {/* Top Row: Date & Desktop Time Slot Selector */}
            <div className="flex flex-row items-start justify-between gap-4 pr-10 md:pr-0">
              {/* Left: Date - Compact Layout (White Text) */}
              <div className="flex flex-col text-white">
                <h1 className="sr-only">{date} 每日AI全栈架构技术简报</h1>
                <div className="flex flex-col gap-3.5">
                  <div
                    aria-hidden="true"
                    className="font-serif text-4xl leading-none font-medium tracking-tight text-balance drop-shadow-md md:text-6xl"
                  >
                    {isToday ? dict.common.today : datePart}
                  </div>
                  <div className="flex items-center gap-1.5 self-start rounded-full bg-white/20 px-2.5 py-1 text-xs text-white/95 drop-shadow-xs md:gap-2 md:px-4 md:py-1.5 md:text-base">
                    {isToday && (
                      <>
                        <span>{datePart}</span>
                        <span className="size-1 rounded-full bg-white/60"></span>
                      </>
                    )}
                    <span>{weekdayPart}</span>
                  </div>
                </div>
              </div>

              {/* Right: Desktop-Only Time Slot Selector & Verdict Filter - Stacked */}
              {date && (
                <div className="hidden flex-col items-end gap-4 self-start md:flex">
                  {/* Row 1: Time Slots */}
                  <div className="flex items-center gap-3">
                    {(['morning', 'afternoon', 'evening'] as const).map((slotOption) => {
                      const labelMap: Record<TimeSlot, string> = {
                        morning: dict.briefing.filters.morning,
                        afternoon: dict.briefing.filters.afternoon,
                        evening: dict.briefing.filters.evening,
                      };
                      const titleMap: Record<TimeSlot, string> = {
                        morning: dict.briefing.filters.morning,
                        afternoon: dict.briefing.filters.afternoon,
                        evening: dict.briefing.filters.evening,
                      };

                      const isSelected = timeSlot === slotOption;
                      return (
                        <button
                          key={slotOption}
                          onClick={() => onTimeSlotChange(isSelected ? null : slotOption)}
                          style={{ WebkitBackdropFilter: isSelected ? 'none' : 'blur(16px)' }}
                          className={`flex size-[44px] shrink-0 items-center justify-center rounded-full border border-white/20 font-serif text-base transition-all duration-300 ${
                            isSelected
                              ? 'scale-110 border-white bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] dark:border-amber-100 dark:bg-amber-100 dark:text-amber-900 dark:shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                              : 'bg-transparent text-white/90 backdrop-blur-md hover:border-white/40 hover:bg-white/20'
                          } cursor-pointer`}
                          title={titleMap[slotOption]}
                        >
                          {labelMap[slotOption]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Row 2: Verdict Type Filter (Insight/News) */}
                  {onVerdictFilterChange && (
                    <div className="flex items-center gap-3">
                      {[
                        {
                          id: '知识洞察型',
                          label: dict.briefing.filters.insight,
                          title: dict.briefing.filters.insight,
                        },
                        {
                          id: '新闻事件型',
                          label: dict.briefing.filters.news,
                          title: dict.briefing.filters.news,
                        },
                      ].map((type) => {
                        const isSelected = verdictFilter === type.id;
                        return (
                          <button
                            key={type.id || 'all'}
                            onClick={() => onVerdictFilterChange(isSelected ? null : type.id)}
                            style={{ WebkitBackdropFilter: isSelected ? 'none' : 'blur(8px)' }}
                            className={`flex h-10 min-w-[44px] items-center justify-center rounded-full border border-white/20 px-3.5 font-serif text-sm transition-all duration-300 ${
                              isSelected
                                ? 'border-white bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.4)] dark:border-amber-100 dark:bg-amber-100 dark:text-amber-900'
                                : 'bg-transparent text-white/80 backdrop-blur-sm hover:bg-white/10'
                            } cursor-pointer`}
                            title={type.title}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Middle Row: Greeting & Count - Unified (White Text) with Separator */}
            {/* Top Row (Mobile Only): Filter Buttons - NOW ABOVE GREETING */}
            <div className="flex items-center gap-4 md:hidden">
              <div className="flex items-center gap-2">
                {(['morning', 'afternoon', 'evening'] as const).map((slotOption) => {
                  const labelMap: Record<TimeSlot, string> = {
                    morning: dict.briefing.filters.morning,
                    afternoon: dict.briefing.filters.afternoon,
                    evening: dict.briefing.filters.evening,
                  };
                  const isSelected = timeSlot === slotOption;
                  return (
                    <button
                      key={slotOption}
                      onClick={() => onTimeSlotChange(isSelected ? null : slotOption)}
                      style={{ WebkitBackdropFilter: isSelected ? 'none' : 'blur(12px)' }}
                      className={`flex size-8 items-center justify-center rounded-full border border-white/20 font-serif text-xs transition-all duration-300 ${
                        isSelected
                          ? 'scale-110 border-white bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] dark:border-amber-100 dark:bg-amber-100 dark:text-amber-900 dark:shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                          : 'bg-transparent text-white/90 backdrop-blur-md'
                      } cursor-pointer`}
                    >
                      {labelMap[slotOption]}
                    </button>
                  );
                })}
              </div>

              {/* Vertical Divider */}
              <div className="h-4 w-px bg-white/30"></div>

              {onVerdictFilterChange && (
                <div className="flex items-center gap-2">
                  {[
                    { id: '知识洞察型', label: dict.briefing.filters.insight },
                    { id: '新闻事件型', label: dict.briefing.filters.news },
                  ].map((type) => {
                    const isSelected = verdictFilter === type.id;
                    return (
                      <button
                        key={type.id || 'all'}
                        onClick={() => onVerdictFilterChange(isSelected ? null : type.id)}
                        style={{ WebkitBackdropFilter: isSelected ? 'none' : 'blur(8px)' }}
                        className={`flex h-7 min-w-[32px] items-center justify-center rounded-full border border-white/20 px-2 font-serif text-[10px] transition-all duration-300 ${
                          isSelected
                            ? 'border-white bg-white text-black dark:border-amber-100 dark:bg-amber-100 dark:text-amber-900'
                            : 'bg-transparent text-white/80 backdrop-blur-sm'
                        } cursor-pointer`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Middle Row: Greeting & Count - NOW BELOW BUTTONS */}
            <div className="border-t border-white/20 pt-2.5 md:pt-4">
              <p className="font-serif text-sm leading-relaxed text-white/95 drop-shadow-xs md:text-lg">
                {isToday ? (
                  <span>
                    {getGreeting()}
                    {dict.briefing.greetings.welcomeToday}
                  </span>
                ) : (
                  <span>{dict.briefing.greetings.welcome}</span>
                )}
                {reports.length > 0 && (
                  <span>
                    {(() => {
                      const count = reports.reduce(
                        (acc, r) => acc + Object.values(r.articles).flat().length,
                        0,
                      );
                      const isEn = dict.lang === 'en';
                      const articleLabel = isEn
                        ? count === 1
                          ? 'article'
                          : 'articles'
                        : '篇文章。';
                      const countTemplate =
                        isToday && isEn
                          ? (dict.briefing.greetings as any).articleCountToday
                          : dict.briefing.greetings.articleCount;

                      return countTemplate
                        .replace('{count}', count.toString())
                        .replace('{articles}', articleLabel);
                    })()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </header>
      );
    }
    return null;
  };

  return (
    <main className="flex-1 px-2 pt-0 md:px-8 md:pt-0 md:pb-10 lg:px-10 lg:pt-2">
      <div className="mx-auto max-w-6xl">
        {renderHeader()}

        {isLoading ? (
          <div className="h-64 py-20">
            <LoadingSpinner />
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-10">
            {reports.map((report) => (
              <ReportContent
                key={report.id}
                report={report}
                onReaderModeRequest={onReaderModeRequest}
                onStateChange={onStateChange}
                dict={dict}
              />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center" data-testid="briefing-empty">
            <p className="text-2xl font-semibold text-stone-600">
              {isToday ? dict.briefing.empty.todayEmpty : dict.briefing.empty.dateEmpty}
            </p>
          </div>
        )}

        {/* Internal Linking Navigation (SEO & UX) */}
        <div className="mt-16 flex items-center justify-between border-t border-stone-200 pt-8 font-serif dark:border-white/10">
          {prevDate ? (
            <Link href={`/date/${prevDate}`} className="group flex items-center transition-colors">
              <span className="mr-3 transform text-lg text-black transition-transform group-hover:-translate-x-1 group-hover:text-indigo-600">
                ←
              </span>
              <div>
                <span className="mb-0.5 block text-sm font-bold tracking-wider text-black uppercase opacity-100">
                  {dict.briefing.navigation.prev}
                </span>
                <span className="text-xl font-extrabold text-black transition-colors group-hover:text-indigo-600">
                  {prevDate}
                </span>
              </div>
            </Link>
          ) : (
            <div></div> // Spacer
          )}

          {nextDate ? (
            <Link
              href={`/date/${nextDate}`}
              className="group flex items-center text-right transition-colors"
            >
              <div>
                <span className="mb-0.5 block text-sm font-bold tracking-wider text-black uppercase opacity-100">
                  {dict.briefing.navigation.next}
                </span>
                <span className="text-xl font-extrabold text-black transition-colors group-hover:text-indigo-600">
                  {nextDate}
                </span>
              </div>
              <span className="ml-3 transform text-lg text-black transition-transform group-hover:translate-x-1 group-hover:text-indigo-600">
                →
              </span>
            </Link>
          ) : (
            <div></div> // Spacer
          )}
        </div>
      </div>
    </main>
  );
};

export default memo(Briefing);
