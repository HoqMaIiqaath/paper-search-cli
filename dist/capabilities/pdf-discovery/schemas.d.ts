import { z } from 'zod';
export declare const DownloadPaperSchema: z.ZodObject<{
    paperId: z.ZodString;
    platform: z.ZodEffects<z.ZodString, string, string>;
    savePath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    paperId: string;
    platform: string;
    savePath?: string | undefined;
}, {
    paperId: string;
    platform: string;
    savePath?: string | undefined;
}>;
export declare const DownloadWithFallbackSchema: z.ZodObject<{
    source: z.ZodString;
    paperId: z.ZodString;
    doi: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    title: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    savePath: z.ZodOptional<z.ZodString>;
    useSciHub: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    paperId: string;
    title: string;
    source: string;
    doi: string;
    useSciHub: boolean;
    savePath?: string | undefined;
}, {
    paperId: string;
    source: string;
    title?: string | undefined;
    doi?: string | undefined;
    savePath?: string | undefined;
    useSciHub?: boolean | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map