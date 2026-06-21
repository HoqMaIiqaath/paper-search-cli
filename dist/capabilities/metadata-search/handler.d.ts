import type { Searchers } from '../../core/searchers.js';
export declare function handleGenericSearch(platform: string, args: any, searchers: Searchers): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleSearchPapers(args: any, searchers: Searchers): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleGetPaperByDoi(args: {
    doi: string;
    platform: string;
}, searchers: Searchers): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
//# sourceMappingURL=handler.d.ts.map