import { createDirectPdfUrlTier } from './tiers/directPdfUrl.js';
import { createPrimaryTier } from './tiers/primary.js';
import { createRepositoryTier } from './tiers/repositories.js';
import { createSciHubTier } from './tiers/scihub.js';
import { createUnpaywallTier } from './tiers/unpaywall.js';
export { INSTITUTIONAL_ACCESS_TIER_ID } from './DownloadTier.js';
export function createDefaultDownloadTiers() {
    return [
        createPrimaryTier(),
        createDirectPdfUrlTier(),
        createRepositoryTier(),
        createUnpaywallTier(),
        createSciHubTier()
    ];
}
export function insertDownloadTierBefore(tiers, beforeStage, tier) {
    const index = tiers.findIndex(item => item.stage === beforeStage);
    if (index < 0)
        return [...tiers, tier];
    return [...tiers.slice(0, index), tier, ...tiers.slice(index)];
}
export async function downloadWithFallback(searchers, options, tiers = createDefaultDownloadTiers()) {
    const savePath = options.savePath || './downloads';
    const attempts = [];
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
function normalizeSource(source) {
    const normalized = source.trim().toLowerCase();
    if (normalized === 'google_scholar')
        return 'googlescholar';
    if (normalized === 'pubmed_central')
        return 'pmc';
    if (normalized === 'europe_pmc')
        return 'europepmc';
    return normalized;
}
//# sourceMappingURL=OpenAccessFallbackService.js.map