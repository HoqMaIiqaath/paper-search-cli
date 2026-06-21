const CITATION_LOOKUP_PROPERTIES = {
    paperId: {
        type: 'string',
        description: 'Semantic Scholar paper id or external id such as DOI:10.xxxx/xxxxx'
    },
    doi: {
        type: 'string',
        description: 'DOI for the target paper; converted to DOI:<doi>'
    },
    arxivId: {
        type: 'string',
        description: 'arXiv id for the target paper; converted to ARXIV:<id>'
    }
};
export const GET_PAPER_CITATIONS_TOOL = {
    name: 'get_paper_citations',
    description: 'Get citing papers for a target paper using Semantic Scholar Graph API. Provide one of paperId, doi, or arxivId.',
    inputSchema: {
        type: 'object',
        properties: {
            ...CITATION_LOOKUP_PROPERTIES,
            limit: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                description: 'Maximum number of citing papers to return. Default: 100'
            }
        }
    }
};
export const GET_PAPER_REFERENCES_TOOL = {
    name: 'get_paper_references',
    description: 'Get cited references for a target paper using Semantic Scholar Graph API. Provide one of paperId, doi, or arxivId.',
    inputSchema: {
        type: 'object',
        properties: {
            ...CITATION_LOOKUP_PROPERTIES,
            limit: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                description: 'Maximum number of cited references to return. Default: 100'
            }
        }
    }
};
export const CITATION_EXPANSION_TOOLS = [GET_PAPER_CITATIONS_TOOL, GET_PAPER_REFERENCES_TOOL];
//# sourceMappingURL=tools.js.map