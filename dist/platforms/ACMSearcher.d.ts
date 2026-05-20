import { Paper } from '../models/Paper.js';
import { DownloadOptions, PaperSource, PlatformCapabilities, SearchOptions } from './PaperSource.js';
export declare class ACMSearcher extends PaperSource {
    private readonly client;
    private readonly mailto;
    constructor(mailto?: string);
    getCapabilities(): PlatformCapabilities;
    search(query: string, options?: SearchOptions): Promise<Paper[]>;
    downloadPdf(_paperId: string, _options?: DownloadOptions): Promise<string>;
    readPaper(_paperId: string, _options?: DownloadOptions): Promise<string>;
    private buildFilter;
    private mapSort;
    private parseItem;
    private parsePublishedDate;
}
//# sourceMappingURL=ACMSearcher.d.ts.map