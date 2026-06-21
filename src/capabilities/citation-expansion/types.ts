export interface CitationData {
  paperId: string;
  title: string;
  citationCount: number;
  referenceCount: number;
  influentialCitationCount?: number;
  year?: number;
  authors?: Array<{ name: string; authorId?: string }>;
  venue?: string;
  doi?: string;
  url?: string;
}

export interface BatchCitationRequest {
  paperId?: string;
  doi?: string;
  arxivId?: string;
  title?: string;
}
