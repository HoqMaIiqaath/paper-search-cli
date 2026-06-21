export const SEARCH_SEMANTIC_SNIPPETS_TOOL = {
  name: 'search_semantic_snippets',
  description:
    'Search Semantic Scholar Open Access snippet index for text excerpts from titles, abstracts, and body text. Requires SEMANTIC_SCHOLAR_API_KEY.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural-language query for text snippets' },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 1000,
        description: 'Maximum number of snippet results to return. Default: 5'
      },
      year: { type: 'string', description: 'Publication year filter, e.g. "2020-2024"' },
      fieldsOfStudy: {
        anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Field-of-study filter, e.g. "Medicine" or ["Medicine","Biology"]'
      },
      paperIds: {
        anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Optional paper IDs to restrict results to, comma-separated or array'
      },
      authors: {
        anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Optional author-name filter, comma-separated or array'
      },
      venue: {
        anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Optional venue filter, comma-separated or array'
      },
      minCitationCount: {
        type: 'number',
        minimum: 0,
        description: 'Only return snippets from papers with at least this many citations'
      },
      publicationDateOrYear: {
        type: 'string',
        description: 'Publication date/year range, e.g. "2020-01-01:2024-12-31"'
      },
      fields: {
        anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        description: 'Optional Semantic Scholar snippet fields to return'
      }
    },
    required: ['query']
  }
};

export const BODY_SNIPPET_SEARCH_TOOLS = [SEARCH_SEMANTIC_SNIPPETS_TOOL];
