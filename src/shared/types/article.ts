export type BrandedString<T extends string> = string & { __brand: T };

export type StateTag = BrandedString<'StateTag'>;
export type FreshRssTag = BrandedString<'FreshRssTag'>;
export type SourceCategory = string;

export interface Verdict {
    type: string;
    score: number;
    importance?: string;
}

export interface Tag {
    id: string;
    label: string;
    count?: number;
}

export interface Article {
    id: string | number;
    created_at: string;
    title: string;
    link: string;
    sourceName: string;
    published: string;
    n8n_processing_date?: string;
    category: string;
    briefingSection: string;
    keywords: string[];
    verdict: Verdict;
    summary?: string;
    tldr: string;
    highlights: string;
    critiques: string;
    marketTake: string;
    tags?: (StateTag | FreshRssTag | SourceCategory)[];
}

export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export type GroupedArticles = {
    [importance: string]: Article[];
};

export interface BriefingReport {
    id: number;
    title: string;
    articles: GroupedArticles;
}

export interface CleanArticleContent {
    title: string;
    content: string; // Sanitized HTML
    source: string;
    tags?: string[]; // Aggregated state tags (Read/Star)
}

export interface AvailableFilters {
    categories: Tag[];
    tags: Tag[];
}

export type Filter = {
    type: 'date' | 'category' | 'tag' | 'starred' | 'search' | 'trends';
    value: string;
};

export interface Subscription {
    id: string;
    title: string;
    category?: string;
    url?: string;
    htmlUrl?: string;
    iconUrl?: string;
}
