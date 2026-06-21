import { z } from 'zod';

export const SearchSemanticSnippetsSchema = z
  .object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(1000).optional().default(5),
    year: z.string().optional(),
    fieldsOfStudy: z.union([z.string(), z.array(z.string())]).optional(),
    paperIds: z.union([z.string(), z.array(z.string())]).optional(),
    authors: z.union([z.string(), z.array(z.string())]).optional(),
    venue: z.union([z.string(), z.array(z.string())]).optional(),
    minCitationCount: z.number().int().min(0).optional(),
    publicationDateOrYear: z.string().optional(),
    fields: z.union([z.string(), z.array(z.string())]).optional()
  })
  .strip();
