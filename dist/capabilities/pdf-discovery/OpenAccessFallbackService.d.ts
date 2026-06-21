import type { Searchers } from '../../core/searchers.js';
import type { DownloadTier } from './DownloadTier.js';
import type { DownloadWithFallbackOptions, DownloadWithFallbackResult } from './types.js';
export { INSTITUTIONAL_ACCESS_TIER_ID } from './DownloadTier.js';
export type { DownloadTier, DownloadTierContext, DownloadTierResult } from './DownloadTier.js';
export type { DownloadWithFallbackOptions, DownloadWithFallbackResult } from './types.js';
export declare function createDefaultDownloadTiers(): DownloadTier[];
export declare function insertDownloadTierBefore(tiers: DownloadTier[], beforeStage: string, tier: DownloadTier): DownloadTier[];
export declare function downloadWithFallback(searchers: Searchers, options: DownloadWithFallbackOptions, tiers?: DownloadTier[]): Promise<DownloadWithFallbackResult>;
//# sourceMappingURL=OpenAccessFallbackService.d.ts.map