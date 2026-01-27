// components/ArticleGroup.tsx

import React, { memo } from 'react';
import { Article } from '@/shared/types';
import ArticleCard from './BriefCard';
import { Dictionary } from '@/app/i18n/dictionaries';
import { BRIEFING_SECTIONS } from '../../constants';

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
  dict: Dictionary;
}

const ArticleGroup: React.FC<ArticleGroupProps> = ({
  importance,
  articles,
  onReaderModeRequest,
  onStateChange,
  dict,
}) => {
  const importanceLabels: Record<string, string> = {
    [BRIEFING_SECTIONS.IMPORTANT]: dict.briefing.sections.important,
    [BRIEFING_SECTIONS.MUST_KNOW]: dict.briefing.sections.mustKnow,
    [BRIEFING_SECTIONS.REGULAR]: dict.briefing.sections.regular,
  };
  if (!articles || articles.length === 0) {
    return null;
  }

  const sectionId = `importance-${importance.replace(/\s+/g, '-')}`;

  return (
    <section id={sectionId} className="mb-12">
      <header className="sticky top-0 z-20 mb-4">
        <div
          style={{ WebkitBackdropFilter: 'blur(4px)' }}
          className="transform-gpu border-b-2 border-transparent bg-transparent px-4 py-3 backdrop-blur-sm [border-image:linear-gradient(to_right,#c8b382,#b9975d,#e7d8ac)_1]"
        >
          <h2 className="font-serif text-[1.35rem] leading-tight font-bold text-[#7a1e16]">
            {importanceLabels[importance] || importance}
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
                dict={dict}
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
