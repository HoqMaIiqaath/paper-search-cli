export declare const DOWNLOAD_PAPER_TOOL: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            paperId: {
                type: string;
                description: string;
            };
            platform: {
                type: string;
                enum: string[];
                description: string;
            };
            savePath: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const DOWNLOAD_WITH_FALLBACK_TOOL: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            source: {
                type: string;
                description: string;
            };
            paperId: {
                type: string;
                description: string;
            };
            doi: {
                type: string;
                description: string;
            };
            title: {
                type: string;
                description: string;
            };
            savePath: {
                type: string;
                description: string;
            };
            useSciHub: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const PDF_DISCOVERY_TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            paperId: {
                type: string;
                description: string;
            };
            platform: {
                type: string;
                enum: string[];
                description: string;
            };
            savePath: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            source: {
                type: string;
                description: string;
            };
            paperId: {
                type: string;
                description: string;
            };
            doi: {
                type: string;
                description: string;
            };
            title: {
                type: string;
                description: string;
            };
            savePath: {
                type: string;
                description: string;
            };
            useSciHub: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
})[];
//# sourceMappingURL=tools.d.ts.map