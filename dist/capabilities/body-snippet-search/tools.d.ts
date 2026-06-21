export declare const SEARCH_SEMANTIC_SNIPPETS_TOOL: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
                description: string;
            };
            year: {
                type: string;
                description: string;
            };
            fieldsOfStudy: {
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
            paperIds: {
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
            authors: {
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
            venue: {
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
            minCitationCount: {
                type: string;
                minimum: number;
                description: string;
            };
            publicationDateOrYear: {
                type: string;
                description: string;
            };
            fields: {
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
        };
        required: string[];
    };
};
export declare const BODY_SNIPPET_SEARCH_TOOLS: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                minimum: number;
                maximum: number;
                description: string;
            };
            year: {
                type: string;
                description: string;
            };
            fieldsOfStudy: {
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
            paperIds: {
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
            authors: {
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
            venue: {
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
            minCitationCount: {
                type: string;
                minimum: number;
                description: string;
            };
            publicationDateOrYear: {
                type: string;
                description: string;
            };
            fields: {
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
        };
        required: string[];
    };
}[];
//# sourceMappingURL=tools.d.ts.map