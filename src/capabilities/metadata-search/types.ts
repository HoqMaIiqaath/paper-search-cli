export interface MultiSourceSearchResult {
  query: string;
  sources_requested: string;
  sources_used: string[];
  source_results: Record<string, number>;
  errors: Record<string, string>;
  failed_sources: string[];
  warnings: string[];
  total: number;
  raw_total: number;
  papers: Record<string, unknown>[];
}
