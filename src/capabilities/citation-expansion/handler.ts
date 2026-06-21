import CitationService from './CitationService.js';
import type { CitationData } from './types.js';

function jsonTextResponse(text: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text
      }
    ]
  };
}

export function resolveCitationTarget(args: { paperId?: string; doi?: string; arxivId?: string }): string {
  if (args.paperId) return args.paperId;
  if (args.doi) return `DOI:${args.doi}`;
  if (args.arxivId) return `ARXIV:${args.arxivId}`;
  throw new Error('Provide paperId, doi, or arxivId');
}

export function citationResponse(target: string, relation: 'citations' | 'references', papers: CitationData[]) {
  return {
    target,
    relation,
    provider: 'semantic_scholar',
    total: papers.length,
    papers
  };
}

export async function handleGetPaperCitations(args: { paperId?: string; doi?: string; arxivId?: string; limit?: number }) {
  const target = resolveCitationTarget(args);
  const service = new CitationService();
  const papers = await service.getCitations(target, args.limit);
  const result = citationResponse(target, 'citations', papers);
  return jsonTextResponse(`Found ${papers.length} citing paper(s).\n\n${JSON.stringify(result, null, 2)}`);
}

export async function handleGetPaperReferences(args: { paperId?: string; doi?: string; arxivId?: string; limit?: number }) {
  const target = resolveCitationTarget(args);
  const service = new CitationService();
  const papers = await service.getReferences(target, args.limit);
  const result = citationResponse(target, 'references', papers);
  return jsonTextResponse(`Found ${papers.length} cited reference(s).\n\n${JSON.stringify(result, null, 2)}`);
}
