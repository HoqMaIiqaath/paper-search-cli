import type { Searchers } from '../../core/searchers.js';
import type { DownloadTier } from './DownloadTier.js';
import type { DownloadWithFallbackOptions, DownloadWithFallbackResult } from './types.js';
import { createDirectPdfUrlTier } from './tiers/directPdfUrl.js';
import { createPrimaryTier } from './tiers/primary.js';
import { createRepositoryTier } from './tiers/repositories.js';
import { createSciHubTier } from './tiers/scihub.js';
import { createUnpaywallTier } from './tiers/unpaywall.js';

export { INSTITUTIONAL_ACCESS_TIER_ID } from './DownloadTier.js';
export type { DownloadTier, DownloadTierContext, DownloadTierResult } from './DownloadTier.js';
export type { DownloadWithFallbackOptions, DownloadWithFallbackResult } from './types.js';

export function createDefaultDownloadTiers(): DownloadTier[] {
  return [
    createPrimaryTier(),
    createDirectPdfUrlTier(),
    createRepositoryTier(),
    createUnpaywallTier(),
    createSciHubTier()
  ];
}

export function insertDownloadTierBefore(
  tiers: DownloadTier[],
  beforeStage: string,
  tier: DownloadTier
): DownloadTier[] {
  const index = tiers.findIndex(item => item.stage === beforeStage);
  if (index < 0) return [...tiers, tier];
  return [...tiers.slice(0, index), tier, ...tiers.slice(index)];
}

export async function downloadWithFallback(
  searchers: Searchers,
  options: DownloadWithFallbackOptions,
  tiers: DownloadTier[] = createDefaultDownloadTiers()
): Promise<DownloadWithFallbackResult> {
  const savePath = options.savePath || './downloads';
  const attempts: DownloadWithFallbackResult['attempts'] = [];
  const context = {
    searchers,
    source: normalizeSource(options.source),
    paperId: options.paperId,
    doi: options.doi,
    title: options.title,
    savePath,
    useSciHub: options.useSciHub !== false
  };

  for (const tier of tiers) {
    const result = await tier.run(context);
    attempts.push({ stage: tier.stage, status: result.status, message: result.message });
    if (result.status === 'ok' && result.path) {
      return { status: 'ok', path: result.path, attempts };
    }
  }

  return { status: 'error', attempts };
}

function normalizeSource(source: string): string {
  const normalized = source.trim().toLowerCase();
  if (normalized === 'google_scholar') return 'googlescholar';
  if (normalized === 'pubmed_central') return 'pmc';
  if (normalized === 'europe_pmc') return 'europepmc';
  return normalized;
}
