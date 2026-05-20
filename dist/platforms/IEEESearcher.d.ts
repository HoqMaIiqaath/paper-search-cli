import { Paper } from '../models/Paper.js';
import { DownloadOptions, PaperSource, PlatformCapabilities, SearchOptions } from './PaperSource.js';
export declare class IEEESearcher extends PaperSource {
    private readonly client;
    constructor(apiKey?: string);
    getCapabilities(): PlatformCapabilities;
    search(query: string, options?: SearchOptions): Promise<Paper[]>;
    downloadPdf(_paperId: string, _options?: DownloadOptions): Promise<string>;
    readPaper(_paperId: string, _options?: DownloadOptions): Promise<string>;
    private mapSortField;
    private parseArticle;
    private extractYear;
    private extractKeywords;
}
//# sourceMappingURL=IEEESearcher.d.ts.map