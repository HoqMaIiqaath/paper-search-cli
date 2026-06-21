export { CitationService, default } from './CitationService.js';
export {
  citationResponse,
  handleGetPaperCitations,
  handleGetPaperReferences,
  resolveCitationTarget
} from './handler.js';
export { CitationLookupSchema } from './schemas.js';
export {
  CITATION_EXPANSION_TOOLS,
  GET_PAPER_CITATIONS_TOOL,
  GET_PAPER_REFERENCES_TOOL
} from './tools.js';

export type { BatchCitationRequest, CitationData } from './types.js';
