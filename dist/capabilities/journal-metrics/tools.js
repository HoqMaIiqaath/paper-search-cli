export const QUERY_JOURNAL_METRICS_TOOL = {
    name: 'query_journal_metrics',
    description: 'Query journal-level metrics from EasyScholar, including JCR impact factor, JCR quartile, CAS zones, JCI, ESI, and optional raw official/custom rank fields. Requires EASYSCHOLAR_KEY.',
    inputSchema: {
        type: 'object',
        properties: {
            journal: {
                type: 'string',
                description: 'Single journal name to query'
            },
            journals: {
                anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                description: 'Journal names as an array or a newline/comma/semicolon-separated string'
            },
            file: {
                type: 'string',
                description: 'Text file with one journal name per line'
            },
            includeRaw: {
                type: 'boolean',
                description: 'Include raw officialRank.all, officialRank.select, and customRank objects. Default: false.'
            }
        }
    }
};
export const JOURNAL_METRICS_TOOLS = [QUERY_JOURNAL_METRICS_TOOL];
//# sourceMappingURL=tools.js.map