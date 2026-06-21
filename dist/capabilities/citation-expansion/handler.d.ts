import type { CitationData } from './types.js';
export declare function resolveCitationTarget(args: {
    paperId?: string;
    doi?: string;
    arxivId?: string;
}): string;
export declare function citationResponse(target: string, relation: 'citations' | 'references', papers: CitationData[]): {
    target: string;
    relation: "references" | "citations";
    provider: string;
    total: number;
    papers: CitationData[];
};
export declare function handleGetPaperCitations(args: {
    paperId?: string;
    doi?: string;
    arxivId?: string;
    limit?: number;
}): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleGetPaperReferences(args: {
    paperId?: string;
    doi?: string;
    arxivId?: string;
    limit?: number;
}): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
//# sourceMappingURL=handler.d.ts.map