import { downloadPdfFromUrl, safeFilename } from '../../../utils/PdfDownload.js';
const REPOSITORY_SOURCES = ['pmc', 'europepmc', 'core', 'openaire'];
export function createRepositoryTier() {
    return {
        id: 'repositories',
        stage: 'repositories',
        run: tryRepositoryFallback
    };
}
async function tryRepositoryFallback(context) {
    const queries = [context.doi || '', context.title || ''].filter(Boolean);
    if (queries.length === 0) {
        return { status: 'skipped', message: 'No DOI/title provided for repository discovery.' };
    }
    for (const source of REPOSITORY_SOURCES) {
        const searcher = context.searchers[source];
        if (!searcher)
            continue;
        for (const query of queries) {
            try {
                const papers = await searcher.search(query, { maxResults: 3 });
                const paper = papers.find(candidate => candidate.pdfUrl);
                if (!paper?.pdfUrl)
                    continue;
                const path = await downloadPdfFromUrl(paper.pdfUrl, context.savePath, `${source}_${safeFilename(paper.paperId)}`);
                return { status: 'ok', path, message: path };
            }
            catch {
                continue;
            }
        }
    }
    return { status: 'skipped', message: 'No repository PDF candidate succeeded.' };
}
//# sourceMappingURL=repositories.js.map