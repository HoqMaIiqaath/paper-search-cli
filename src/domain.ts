import { z } from "zod";

export const EvidenceLevelSchema = z.enum([
  "metadata",
  "abstract",
  "snippet",
  "full_text",
]);
export type EvidenceLevel = z.infer<typeof EvidenceLevelSchema>;

export const OpenAccessSchema = z.enum(["open", "closed", "unknown"]);
export type OpenAccess = z.infer<typeof OpenAccessSchema>;

export const PaperRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  venue: z.string().nullable(),
  doi: z.string().nullable(),
  arxiv_id: z.string().nullable(),
  pmid: z.string().nullable(),
  pmcid: z.string().nullable(),
  semantic_scholar_id: z.string().nullable(),
  url: z.string().nullable(),
  abstract: z.string().nullable(),
  citation_count: z.number().int().nonnegative().nullable(),
  sources: z.array(z.string()),
  open_access: OpenAccessSchema,
  evidence_level: EvidenceLevelSchema,
  retrieved_at: z.string(),
});
export type PaperRecord = z.infer<typeof PaperRecordSchema>;

export const CitationEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  type: z.literal("cites"),
});
export type CitationEdge = z.infer<typeof CitationEdgeSchema>;

export const VisualizationDatasetSchema = z.object({
  citation_network: z.object({
    nodes: z.array(PaperRecordSchema),
    edges: z.array(CitationEdgeSchema),
  }),
  publication_timeline: z.object({
    papers: z.array(PaperRecordSchema),
  }),
  source_coverage: z.array(
    z.object({
      source: z.string(),
      paper_count: z.number().int().nonnegative(),
    }),
  ),
  evidence_matrix: z.object({
    dimensions: z.array(z.string()),
    papers: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        evidence_level: EvidenceLevelSchema,
        values: z.record(z.string(), z.string().nullable()),
      }),
    ),
  }),
});
export type VisualizationDataset = z.infer<
  typeof VisualizationDatasetSchema
>;

export interface Provenance {
  provider: "paper-search-cli";
  retrieved_at: string;
  evidence_level: EvidenceLevel;
}

export interface WorkflowEnvelope<T> {
  ok: true;
  data: T;
  provenance: Provenance;
}

export function envelope<T>(
  data: T,
  evidenceLevel: EvidenceLevel,
): WorkflowEnvelope<T> {
  return {
    ok: true,
    data,
    provenance: {
      provider: "paper-search-cli",
      retrieved_at: new Date().toISOString(),
      evidence_level: evidenceLevel,
    },
  };
}
