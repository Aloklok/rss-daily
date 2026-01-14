// @deprecated Use @/domains/reading/services
export * from '@/domains/reading/services';

// Legacy alias for backward compatibility
export { fetchArticleContent as fetchArticleContentServer } from '@/domains/reading/services';

// @deprecated Use @/domains/interaction/adapters/fresh-rss
// Explicitly export these as they were moved to Interaction domain but previously here
export {
  fetchArticleStatesServer,
  attachArticleStates,
} from '@/domains/interaction/adapters/fresh-rss';
