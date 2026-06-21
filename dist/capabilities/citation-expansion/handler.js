import CitationService from './CitationService.js';
function jsonTextResponse(text) {
    return {
        content: [
            {
                type: 'text',
                text
            }
        ]
    };
}
export function resolveCitationTarget(args) {
    if (args.paperId)
        return args.paperId;
    if (args.doi)
        return `DOI:${args.doi}`;
    if (args.arxivId)
        return `ARXIV:${args.arxivId}`;
    throw new Error('Provide paperId, doi, or arxivId');
}
export function citationResponse(target, relation, papers) {
    return {
        target,
        relation,
        provider: 'semantic_scholar',
        total: papers.length,
        papers
    };
}
export async function handleGetPaperCitations(args) {
    const target = resolveCitationTarget(args);
    const service = new CitationService();
    const papers = await service.getCitations(target, args.limit);
    const result = citationResponse(target, 'citations', papers);
    return jsonTextResponse(`Found ${papers.length} citing paper(s).\n\n${JSON.stringify(result, null, 2)}`);
}
export async function handleGetPaperReferences(args) {
    const target = resolveCitationTarget(args);
    const service = new CitationService();
    const papers = await service.getReferences(target, args.limit);
    const result = citationResponse(target, 'references', papers);
    return jsonTextResponse(`Found ${papers.length} cited reference(s).\n\n${JSON.stringify(result, null, 2)}`);
}
//# sourceMappingURL=handler.js.map