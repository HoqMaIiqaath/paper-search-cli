/**
 * BioRxivSearcher Platform Tests
 * Also covers medRxiv as they share the same implementation
 */

import axios from 'axios';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BioRxivSearcher } from '../../src/platforms/BioRxivSearcher.js';

describe('BioRxivSearcher', () => {
  let bioRxivSearcher: BioRxivSearcher;
  let medRxivSearcher: BioRxivSearcher;

  beforeEach(() => {
    bioRxivSearcher = new BioRxivSearcher('biorxiv');
    medRxivSearcher = new BioRxivSearcher('medrxiv');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities for bioRxiv', () => {
      const caps = bioRxivSearcher.getCapabilities();
      expect(caps.search).toBe(true);
      expect(caps.download).toBe(true);
      expect(caps.fullText).toBe(true);
      expect(caps.requiresApiKey).toBe(false);
    });

    it('should return correct capabilities for medRxiv', () => {
      const caps = medRxivSearcher.getCapabilities();
      expect(caps.search).toBe(true);
      expect(caps.download).toBe(true);
    });
  });

  describe('constructor', () => {
    it('should support biorxiv server', () => {
      const instance = new BioRxivSearcher('biorxiv');
      expect(instance).toBeDefined();
    });

    it('should support medrxiv server', () => {
      const instance = new BioRxivSearcher('medrxiv');
      expect(instance).toBeDefined();
    });
  });

  describe('search options', () => {
    it('should support days filter', () => {
      expect(bioRxivSearcher.search).toBeDefined();
    });

    it('should support category filter', () => {
      // e.g., neuroscience, genomics, infectious_diseases
      expect(bioRxivSearcher.search).toBeDefined();
    });

    it('paginates details records and applies query as text search', async () => {
      const firstPage = Array.from({ length: 30 }, (_, index) => makeBioRxivPaper({
        doi: `10.1101/nonmatch${index}`,
        title: `Unrelated preprint ${index}`,
        abstract: 'No target term here.'
      }));
      const secondPage = [
        makeBioRxivPaper({
          doi: '10.1101/crispr-hit',
          title: 'CRISPR screen identifies therapeutic targets',
          abstract: 'Genome editing screen.'
        })
      ];
      const get = jest.spyOn(axios, 'get')
        .mockResolvedValueOnce(response(firstPage, '31'))
        .mockResolvedValueOnce(response(secondPage, '31'));

      const results = await bioRxivSearcher.search('CRISPR', { maxResults: 1, days: 3650 });

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('CRISPR');
      expect(get).toHaveBeenCalledTimes(2);
      expect(String(get.mock.calls[0][0])).toMatch(/\/0$/);
      expect(String(get.mock.calls[1][0])).toMatch(/\/30$/);
      expect(get.mock.calls[0][1]).not.toHaveProperty('params');
    });

    it('uses category option as a local category filter', async () => {
      jest.spyOn(axios, 'get').mockResolvedValue(response([
        makeBioRxivPaper({
          doi: '10.1101/category-hit',
          title: 'Genomics preprint',
          category: 'genetic and genomic medicine'
        }),
        makeBioRxivPaper({
          doi: '10.1101/category-miss',
          title: 'Neuroscience preprint',
          category: 'neuroscience'
        })
      ], '2'));

      const results = await medRxivSearcher.search('*', {
        maxResults: 2,
        category: 'genetic_and_genomic_medicine'
      });

      expect(results).toHaveLength(1);
      expect(results[0].doi).toBe('10.1101/category-hit');
    });
  });

  describe('downloadPdf', () => {
    it('should be available for bioRxiv', () => {
      expect(bioRxivSearcher.downloadPdf).toBeDefined();
    });

    it('should be available for medRxiv', () => {
      expect(medRxivSearcher.downloadPdf).toBeDefined();
    });
  });
});

function response(collection: any[], total = String(collection.length)) {
  return {
    status: 200,
    statusText: 'OK',
    data: {
      messages: [{ status: 'ok', count: collection.length, total }],
      collection
    }
  };
}

function makeBioRxivPaper(overrides: Partial<Record<string, string>> = {}) {
  return {
    doi: '10.1101/default',
    title: 'Default bioRxiv preprint',
    authors: 'A. Author; B. Writer',
    author_corresponding: 'A. Author',
    author_corresponding_institution: 'Example University',
    date: '2024-01-01',
    version: '1',
    type: 'New Results',
    license: 'cc_by',
    category: 'bioinformatics',
    jatsxml: '',
    abstract: 'Default abstract.',
    server: 'bioRxiv',
    ...overrides
  };
}
