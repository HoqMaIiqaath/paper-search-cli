import type { Searchers } from '../../core/searchers.js';
export interface DownloadTier {
    id: string;
    stage: string;
    run(context: DownloadTierContext): Promise<DownloadTierResult>;
}
export interface DownloadTierContext {
    searchers: Searchers;
    source: string;
    paperId: string;
    doi?: string;
    title?: string;
    savePath: string;
    useSciHub: boolean;
}
export interface DownloadTierResult {
    status: 'ok' | 'error' | 'skipped';
    path?: string;
    message: string;
}
export declare const INSTITUTIONAL_ACCESS_TIER_ID = "institutional_access";
//# sourceMappingURL=DownloadTier.d.ts.map