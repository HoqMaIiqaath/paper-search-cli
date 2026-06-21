export interface DownloadWithFallbackOptions {
    source: string;
    paperId: string;
    doi?: string;
    title?: string;
    savePath?: string;
    /** When false, suppress the final Sci-Hub fallback. Default is true. */
    useSciHub?: boolean;
}
export interface DownloadWithFallbackResult {
    status: 'ok' | 'error';
    path?: string;
    attempts: Array<{
        stage: string;
        status: 'ok' | 'error' | 'skipped';
        message: string;
    }>;
}
//# sourceMappingURL=types.d.ts.map