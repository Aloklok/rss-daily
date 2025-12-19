// components/ArticleGroup.tsx

import React, { memo, useEffect, useRef, useState } from 'react';
import { Article } from '../../../types';
import ArticleCard from './BriefCard';

const DecorativeDivider = () => (
  <div className="my-8 flex items-center justify-center">
    <span className="h-px w-20 bg-stone-500"></span>
    <span className="mx-4 text-lg text-stone-500">◆</span>
    <span className="h-px w-20 bg-stone-500"></span>
  </div>
);

interface ArticleGroupProps {
  importance: string;
  articles: Article[];
  onReaderModeRequest: (article: Article) => void;
  onStateChange: (
    articleId: string | number,
    tagsToAdd: string[],
    tagsToRemove: string[],
  ) => Promise<void>;
}

const ArticleGroup: React.FC<ArticleGroupProps> = ({
  importance,
  articles,
  onReaderModeRequest,
  onStateChange,
}) => {
  const [isStuck, setIsStuck] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the sentinel moves out of view (scrolled past top), header is stuck
        // We check boundingClientRect.top < 0 to ensure it's scrolled *up* not just off-screen bottom
        setIsStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 1.0 },
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!articles || articles.length === 0) {
    return null;
  }

  const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;

  return (
    <section id={sectionId} className="relative mb-12">
      {/* Sentinel for sticky detection - placed just before the sticky header */}
      <div
        ref={observerRef}
        className="pointer-events-none absolute -top-1 right-0 left-0 h-1 opacity-0"
      />

      <header className="sticky top-0 z-20 mb-4 transition-all duration-300">
        <div
          className={`border-b-2 border-transparent px-4 py-3 transition-all duration-500 [border-image:linear-gradient(to_right,#c8b382,#b9975d,#e7d8ac)_1] ${
            isStuck
              ? 'bg-white/80 shadow-sm backdrop-blur-md dark:bg-gray-900/80'
              : 'bg-transparent backdrop-blur-none'
          }`}
        >
          <h2 className="font-serif text-[1.35rem] leading-tight font-bold text-[#7a1e16]">
            {importance}
          </h2>
        </div>
      </header>

      <div className="flex flex-col">
        {articles.map((article, index) => (
          <React.Fragment key={article.id}>
            <div id={`article-${article.id}`}>
              <ArticleCard
                article={article}
                onReaderModeRequest={onReaderModeRequest}
                onStateChange={onStateChange}
              />
            </div>
            {index < articles.length - 1 && <DecorativeDivider />}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

export default memo(ArticleGroup);
