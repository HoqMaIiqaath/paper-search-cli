import { z } from 'zod';

export const CitationLookupSchema = z
  .object({
    paperId: z.coerce.string().min(1).optional(),
    doi: z.coerce.string().min(1).optional(),
    arxivId: z.coerce.string().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional().default(100)
  })
  .strip()
  .refine(value => Boolean(value.paperId || value.doi || value.arxivId), {
    message: 'Provide paperId, doi, or arxivId'
  });
