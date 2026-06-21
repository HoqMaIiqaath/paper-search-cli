export {
  createDefaultDownloadTiers,
  downloadWithFallback,
  INSTITUTIONAL_ACCESS_TIER_ID,
  insertDownloadTierBefore
} from '../capabilities/pdf-discovery/OpenAccessFallbackService.js';

export type {
  DownloadTier,
  DownloadTierContext,
  DownloadTierResult
} from '../capabilities/pdf-discovery/DownloadTier.js';

export type {
  DownloadWithFallbackOptions,
  DownloadWithFallbackResult
} from '../capabilities/pdf-discovery/types.js';
