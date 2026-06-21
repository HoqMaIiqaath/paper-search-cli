import type { Searchers } from '../../core/searchers.js';
import { Paper } from '../../models/Paper.js';
import { SearchOptions } from '../../platforms/PaperSource.js';
import type { MultiSourceSearchResult } from './types.js';
export type { MultiSourceSearchResult } from './types.js';
export declare function parseSourceList(sources: string | undefined, searchers: Searchers): string[];
export declare function searchMultipleSources(searchers: Searchers, query: string, sources: string, options: SearchOptions, sourceTimeoutMs?: number): Promise<MultiSourceSearchResult>;
export declare function dedupePapers(papers: Paper[]): Paper[];
//# sourceMappingURL=MultiSourceSearchService.d.ts.map