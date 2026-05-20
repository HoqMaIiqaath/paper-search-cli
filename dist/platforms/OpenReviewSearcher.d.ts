import { Paper } from '../models/Paper.js';
import { DownloadOptions, PaperSource, PlatformCapabilities, SearchOptions } from './PaperSource.js';
export declare class OpenReviewSearcher extends PaperSource {
    private readonly client;
    constructor();
    getCapabilities(): PlatformCapabilities;
    search(query: string, options?: SearchOptions): Promise<Paper[]>;
    downloadPdf(_paperId: string, _options?: DownloadOptions): Promise<string>;
    readPaper(_paperId: string, _options?: DownloadOptions): Promise<string>;
    private parseNote;
    private matchesOptions;
    private yearMatches;
    private contentValue;
    private asString;
    private asStringArray;
    private resolveOpenReviewUrl;
    private extractDoi;
}
//# sourceMappingURL=OpenReviewSearcher.d.ts.map