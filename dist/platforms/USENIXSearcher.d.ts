import { Paper } from '../models/Paper.js';
import { DownloadOptions, PaperSource, PlatformCapabilities, SearchOptions } from './PaperSource.js';
import { DBLPSearcher } from './DBLPSearcher.js';
export declare class USENIXSearcher extends PaperSource {
    private readonly dblp;
    constructor(dblpSearcher?: DBLPSearcher);
    getCapabilities(): PlatformCapabilities;
    search(query: string, options?: SearchOptions): Promise<Paper[]>;
    downloadPdf(_paperId: string, _options?: DownloadOptions): Promise<string>;
    readPaper(_paperId: string, _options?: DownloadOptions): Promise<string>;
    private isUsenixPaper;
    private toUsenixPaper;
}
//# sourceMappingURL=USENIXSearcher.d.ts.map