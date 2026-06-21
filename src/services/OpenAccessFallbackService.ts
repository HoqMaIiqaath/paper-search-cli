import type { Searchers } from '../core/searchers.js';
import { PaperSource } from '../platforms/PaperSource.js';
import { UnpaywallSearcher } from '../platforms/UnpaywallSearcher.js';
import { downloadPdfFromUrl, safeFilename } from '../utils/PdfDownload.js';

export interface DownloadWithFallbackOptions {
  source: string;
  paperId: string;
  doi?: string;
  title?: string;
  savePath?: string;
  /** When false, suppress the final Sci-Hub fallback. Default is true. */
  useSciHub?: boolean;
}

export interface DownloadWithFallbackResult {
  status: 'ok' | 'error';
  path?: string;
  attempts: Array<{ stage: string; status: 'ok' | 'error' | 'skipped'; message: string }>;
}

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

export const INSTITUTIONAL_ACCESS_TIER_ID = 'institutional_access';

const REPOSITORY_SOURCES = ['pmc', 'europepmc', 'core', 'openaire'];

const DEFAULT_DOWNLOAD_TIERS: DownloadTier[] = [
  {
    id: 'primary',
    stage: 'primary',
    run: tryPrimaryDownload
  },
  {
    id: 'direct_pdf_url',
    stage: 'direct_pdf_url',
    run: tryDirectMetadataUrl
  },
  {
    id: 'repositories',
    stage: 'repositories',
    run: tryRepositoryFallback
  },
  {
    id: 'unpaywall',
    stage: 'unpaywall',
    run: tryUnpaywall
  },
  {
    id: 'scihub',
    stage: 'scihub',
    run: trySciHub
  }
];

export async function downloadWithFallback(
  searchers: Searchers,
  options: DownloadWithFallbackOptions
): Promise<DownloadWithFallbackResult> {
  const savePath = options.savePath || './downloads';
  const attempts: DownloadWithFallbackResult['attempts'] = [];
  const context: DownloadTierContext = {
    searchers,
    source: normalizeSource(options.source),
    paperId: options.paperId,
    doi: options.doi,
    title: options.title,
    savePath,
    useSciHub: options.useSciHub !== false
  };

  for (const tier of DEFAULT_DOWNLOAD_TIERS) {
    const result = await tier.run(context);
    attempts.push({ stage: tier.stage, status: result.status, message: result.message });
    if (result.status === 'ok' && result.path) {
      return { status: 'ok', path: result.path, attempts };
    }
  }

  return { status: 'error', attempts };
}

async function tryPrimaryDownload(context: DownloadTierContext): Promise<DownloadTierResult> {
  const primary = (context.searchers as any)[context.source] as PaperSource | undefined;
  if (!primary?.getCapabilities().download) {
    return { status: 'skipped', message: `No primary downloader for ${context.source}` };
  }

  try {
    const path = await primary.downloadPdf(context.paperId, { savePath: context.savePath });
    return { status: 'ok', path, message: path };
  } catch (error: any) {
    return { status: 'error', message: error?.message || String(error) };
  }
}

async function tryDirectMetadataUrl(context: DownloadTierContext): Promise<DownloadTierResult> {
  const searcher = (context.searchers as any)[context.source] as PaperSource | undefined;
  if (!searcher) {
    return { status: 'skipped', message: `No metadata searcher for ${context.source}.` };
  }

  try {
    const paper = await searcher.getPaperByDoi(context.paperId);
    if (!paper?.pdfUrl) {
      return { status: 'skipped', message: 'No pdf_url found in source metadata.' };
    }
    const path = await downloadPdfFromUrl(paper.pdfUrl, context.savePath, `${context.source}_${safeFilename(paper.paperId)}`);
    return { status: 'ok', path, message: path };
  } catch (error: any) {
    return { status: 'error', message: error?.message || String(error) };
  }
}

async function tryRepositoryFallback(context: DownloadTierContext): Promise<DownloadTierResult> {
  const queries = [context.doi || '', context.title || ''].filter(Boolean);
  if (queries.length === 0) {
    return { status: 'skipped', message: 'No DOI/title provided for repository discovery.' };
  }

  for (const source of REPOSITORY_SOURCES) {
    const searcher = (context.searchers as any)[source] as PaperSource | undefined;
    if (!searcher) continue;

    for (const query of queries) {
      try {
        const papers = await searcher.search(query, { maxResults: 3 });
        const paper = papers.find(candidate => candidate.pdfUrl);
        if (!paper?.pdfUrl) continue;

        const path = await downloadPdfFromUrl(paper.pdfUrl, context.savePath, `${source}_${safeFilename(paper.paperId)}`);
        return { status: 'ok', path, message: path };
      } catch {
        continue;
      }
    }
  }

  return { status: 'skipped', message: 'No repository PDF candidate succeeded.' };
}

async function tryUnpaywall(context: DownloadTierContext): Promise<DownloadTierResult> {
  if (!context.doi) {
    return { status: 'skipped', message: 'DOI not provided.' };
  }

  try {
    const unpaywall = context.searchers.unpaywall as UnpaywallSearcher;
    const pdfUrl = await unpaywall.resolveBestPdfUrl(context.doi);
    if (!pdfUrl) {
      return { status: 'skipped', message: 'No OA PDF URL found or email not configured.' };
    }
    const path = await downloadPdfFromUrl(pdfUrl, context.savePath, `unpaywall_${safeFilename(context.doi)}`);
    return { status: 'ok', path, message: path };
  } catch (error: any) {
    return { status: 'error', message: error?.message || String(error) };
  }
}

async function trySciHub(context: DownloadTierContext): Promise<DownloadTierResult> {
  if (!context.useSciHub) {
    return { status: 'skipped', message: 'Sci-Hub fallback disabled by useSciHub=false.' };
  }

  const identifier = context.doi || context.title || context.paperId;
  try {
    const path = await context.searchers.scihub.downloadPdf(identifier, { savePath: context.savePath });
    return { status: 'ok', path, message: path };
  } catch (error: any) {
    return { status: 'error', message: error?.message || String(error) };
  }
}

function normalizeSource(source: string): string {
  const normalized = source.trim().toLowerCase();
  if (normalized === 'google_scholar') return 'googlescholar';
  if (normalized === 'pubmed_central') return 'pmc';
  if (normalized === 'europe_pmc') return 'europepmc';
  return normalized;
}
