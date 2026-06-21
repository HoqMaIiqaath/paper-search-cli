import { afterEach, describe, expect, it } from '@jest/globals';
import { parseToolArgs } from '../../src/core/schemas.js';

describe('schemas', () => {
  const originalCoreCap = process.env.CORE_MAX_RESULTS_CAP;

  afterEach(() => {
    if (originalCoreCap === undefined) delete process.env.CORE_MAX_RESULTS_CAP;
    else process.env.CORE_MAX_RESULTS_CAP = originalCoreCap;
  });

  it('keeps CORE maxResults capped at 100 by default', () => {
    delete process.env.CORE_MAX_RESULTS_CAP;

    expect(() => parseToolArgs('search_core', { query: 'machine learning', maxResults: 101 })).toThrow(
      'CORE maxResults must be less than or equal to 100'
    );
  });

  it('allows users to raise the CORE maxResults cap up to the hard limit', () => {
    process.env.CORE_MAX_RESULTS_CAP = '300';

    expect(parseToolArgs('search_core', { query: 'machine learning', maxResults: 300 })).toEqual({
      query: 'machine learning',
      maxResults: 300
    });
    expect(() => parseToolArgs('search_core', { query: 'machine learning', maxResults: 301 })).toThrow(
      'CORE maxResults must be less than or equal to 300'
    );
  });

  it('applies the CORE cap to the generic search command when platform is core', () => {
    process.env.CORE_MAX_RESULTS_CAP = '300';

    expect(parseToolArgs('search_papers', { query: 'machine learning', platform: 'core', maxResults: 300 })).toEqual(
      expect.objectContaining({
        query: 'machine learning',
        platform: 'core',
        maxResults: 300
      })
    );
    expect(() => parseToolArgs('search_papers', { query: 'machine learning', platform: 'crossref', maxResults: 300 })).toThrow(
      'Number must be less than or equal to 100'
    );
  });

  it('clamps CORE_MAX_RESULTS_CAP to the hard maximum', () => {
    process.env.CORE_MAX_RESULTS_CAP = '9999';

    expect(parseToolArgs('search_core', { query: 'machine learning', maxResults: 500 })).toEqual({
      query: 'machine learning',
      maxResults: 500
    });
    expect(() => parseToolArgs('search_core', { query: 'machine learning', maxResults: 501 })).toThrow(
      'CORE maxResults must be less than or equal to 500'
    );
  });

  it('requires one citation target identifier', () => {
    expect(() => parseToolArgs('get_paper_citations', {})).toThrow('Provide paperId, doi, or arxivId');
    expect(() => parseToolArgs('get_paper_references', { limit: 5 })).toThrow('Provide paperId, doi, or arxivId');
  });

  it('defaults citation lookup limit to 100', () => {
    expect(parseToolArgs('get_paper_citations', { doi: '10.1000/example' })).toEqual({
      doi: '10.1000/example',
      limit: 100
    });
  });

  it('bounds citation lookup limit to 1 through 100', () => {
    expect(() => parseToolArgs('get_paper_citations', { doi: '10.1000/example', limit: 0 })).toThrow(
      'Number must be greater than or equal to 1'
    );
    expect(() => parseToolArgs('get_paper_citations', { doi: '10.1000/example', limit: 101 })).toThrow(
      'Number must be less than or equal to 100'
    );
  });

  it('preserves citation identifiers for handleToolCall priority resolution', () => {
    expect(
      parseToolArgs('get_paper_references', {
        paperId: 'paper-1',
        doi: '10.1000/example',
        arxivId: '2401.00001',
        limit: 3
      })
    ).toEqual({
      paperId: 'paper-1',
      doi: '10.1000/example',
      arxivId: '2401.00001',
      limit: 3
    });
  });
});
