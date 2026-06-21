export declare const QUERY_JOURNAL_METRICS_TOOL: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            journal: {
                type: string;
                description: string;
            };
            journals: {
                anyOf: ({
                    type: string;
                    items?: undefined;
                } | {
                    type: string;
                    items: {
                        type: string;
                    };
                })[];
                description: string;
            };
            file: {
                type: string;
                description: string;
            };
            includeRaw: {
                type: string;
                description: string;
            };
        };
    };
};
export declare const JOURNAL_METRICS_TOOLS: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            journal: {
                type: string;
                description: string;
            };
            journals: {
                anyOf: ({
                    type: string;
                    items?: undefined;
                } | {
                    type: string;
                    items: {
                        type: string;
                    };
                })[];
                description: string;
            };
            file: {
                type: string;
                description: string;
            };
            includeRaw: {
                type: string;
                description: string;
            };
        };
    };
}[];
//# sourceMappingURL=tools.d.ts.map