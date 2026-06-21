export type { SemanticSnippetResult } from '../../platforms/SemanticScholarSearcher.js';
export interface SemanticSnippetSearchArgs {
    query: string;
    limit?: number;
    year?: string;
    fieldsOfStudy?: string | string[];
    paperIds?: string | string[];
    authors?: string | string[];
    venue?: string | string[];
    minCitationCount?: number;
    publicationDateOrYear?: string;
    fields?: string | string[];
}
//# sourceMappingURL=types.d.ts.map