import { Paper } from '../models/Paper.js';
import { DownloadOptions, PaperSource, PlatformCapabilities, SearchOptions } from './PaperSource.js';
export declare class DBLPSearcher extends PaperSource {
    private readonly client;
    constructor();
    getCapabilities(): PlatformCapabilities;
    search(query: string, options?: SearchOptions): Promise<Paper[]>;
    downloadPdf(_paperId: string, _options?: DownloadOptions): Promise<string>;
    readPaper(_paperId: string, _options?: DownloadOptions): Promise<string>;
    private buildQuery;
    private parseHit;
    private parseAuthors;
    private firstValue;
    private asArray;
}
//# sourceMappingURL=DBLPSearcher.d.ts.map