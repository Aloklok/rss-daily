import { Article } from '@/shared/types';
import { RANKING_WEIGHTS } from './weights';

export type RankingStrategy = (a: Article, b: Article) => number;

export const sortByScoreOnly: RankingStrategy = (a, b) => {
  return (b.verdict?.score || 0) - (a.verdict?.score || 0);
};

export const sortByImportanceAndScore: RankingStrategy = (a, b) => {
  const impA = a.verdict?.importance || 'Regular';
  const impB = b.verdict?.importance || 'Regular';

  const bonusA =
    RANKING_WEIGHTS.IMPORTANCE_BONUS[impA as keyof typeof RANKING_WEIGHTS.IMPORTANCE_BONUS] || 0;
  const bonusB =
    RANKING_WEIGHTS.IMPORTANCE_BONUS[impB as keyof typeof RANKING_WEIGHTS.IMPORTANCE_BONUS] || 0;

  const scoreA = (a.verdict?.score || 0) * RANKING_WEIGHTS.SCORE + bonusA;
  const scoreB = (b.verdict?.score || 0) * RANKING_WEIGHTS.SCORE + bonusB;

  return scoreB - scoreA;
};

// Default strategy matches current production logic (Score descending)
// Note: Current production logic in dataFetcher just sorts by score within groups.
// The grouping handled the importance separation.
// So sortByScoreOnly is sufficient for intra-group sorting.
export const defaultStrategy = sortByScoreOnly;
