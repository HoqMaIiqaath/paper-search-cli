import { z } from 'zod';
export const QueryJournalMetricsSchema = z
    .object({
    journal: z.string().optional(),
    journals: z.union([z.string(), z.array(z.string())]).optional(),
    file: z.string().optional(),
    includeRaw: z.boolean().optional().default(false)
})
    .strip()
    .refine(value => Boolean(value.journal || value.journals || value.file), {
    message: 'Provide journal, journals, or file'
});
//# sourceMappingURL=schemas.js.map