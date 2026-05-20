import { describe, expect, it, jest } from '@jest/globals';
import { downloadWithFallback } from '../../src/services/OpenAccessFallbackService.js';

describe('OpenAccessFallbackService', () => {
  it('uses Sci-Hub as the final fallback by default', async () => {
    const scihubDownload = jest.fn(async () => '/tmp/paper.pdf');
    const searchers = {
      crossref: {
        getCapabilities: () => ({ download: false }),
        getPaperByDoi: async () => null
      },
      scihub: {
        downloadPdf: scihubDownload
      }
    } as any;

    const result = await downloadWithFallback(searchers, {
      source: 'crossref',
      paperId: '10.1000/example',
      doi: '10.1000/example'
    });

    expect(result.status).toBe('ok');
    expect(result.path).toBe('/tmp/paper.pdf');
    expect(scihubDownload).toHaveBeenCalledWith('10.1000/example', { savePath: './downloads' });
    expect(result.attempts.map(attempt => attempt.stage)).toContain('scihub');
  });

  it('allows callers to suppress the Sci-Hub fallback explicitly', async () => {
    const scihubDownload = jest.fn(async () => '/tmp/paper.pdf');
    const searchers = {
      crossref: {
        getCapabilities: () => ({ download: false }),
        getPaperByDoi: async () => null
      },
      scihub: {
        downloadPdf: scihubDownload
      }
    } as any;

    const result = await downloadWithFallback(searchers, {
      source: 'crossref',
      paperId: '10.1000/example',
      doi: '10.1000/example',
      useSciHub: false
    });

    expect(result.status).toBe('error');
    expect(scihubDownload).not.toHaveBeenCalled();
    expect(result.attempts).toContainEqual({
      stage: 'scihub',
      status: 'skipped',
      message: 'Sci-Hub fallback disabled by useSciHub=false.'
    });
  });
});
