import { z } from 'zod';
export declare const SearchSemanticSnippetsSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    year: z.ZodOptional<z.ZodString>;
    fieldsOfStudy: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    paperIds: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    authors: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    venue: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    minCitationCount: z.ZodOptional<z.ZodNumber>;
    publicationDateOrYear: z.ZodOptional<z.ZodString>;
    fields: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    authors?: string | string[] | undefined;
    year?: string | undefined;
    venue?: string | string[] | undefined;
    fieldsOfStudy?: string | string[] | undefined;
    fields?: string | string[] | undefined;
    paperIds?: string | string[] | undefined;
    minCitationCount?: number | undefined;
    publicationDateOrYear?: string | undefined;
}, {
    query: string;
    authors?: string | string[] | undefined;
    year?: string | undefined;
    venue?: string | string[] | undefined;
    fieldsOfStudy?: string | string[] | undefined;
    limit?: number | undefined;
    fields?: string | string[] | undefined;
    paperIds?: string | string[] | undefined;
    minCitationCount?: number | undefined;
    publicationDateOrYear?: string | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map