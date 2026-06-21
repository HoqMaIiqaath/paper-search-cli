import type { Searchers } from '../../core/searchers.js';
import { downloadWithFallback } from './OpenAccessFallbackService.js';
export declare function handleDownloadPaper(args: {
    paperId: string;
    platform: string;
    savePath?: string;
}, searchers: Searchers): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
export declare function handleDownloadWithFallback(args: Parameters<typeof downloadWithFallback>[1], searchers: Searchers): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
//# sourceMappingURL=handler.d.ts.map