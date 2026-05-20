import type { SearchOptions } from '../platforms/PaperSource.js';
export type PlatformSourceKind = 'official-api' | 'metadata-proxy' | 'html' | 'alias';
export interface PlatformMetadata {
    id: string;
    aliases?: string[];
    displayName: string;
    sourceKind: PlatformSourceKind;
    defaultInAll: boolean;
    directTool?: boolean;
    toolName?: string;
    configKeys?: string[][];
    optionalConfigKeys?: string[][];
    supportedOptions: (keyof SearchOptions)[];
    description?: string;
}
export declare const PLATFORM_METADATA: PlatformMetadata[];
export declare const SEARCH_PLATFORM_IDS: string[];
export declare const SEARCH_PLATFORM_VALUES: string[];
export declare const DEFAULT_ALL_SOURCES: string[];
export declare function resolvePlatformId(platform: string): string;
export declare function isPlatformAlias(platform: string): boolean;
export declare function isKnownSearchPlatform(platform: string): boolean;
export declare function getPlatformMetadata(platform: string): PlatformMetadata | undefined;
export declare function getDefaultAllSources(): string[];
export declare function getAliasMap(): Record<string, string>;
export declare function getGenericSearchToolPlatform(toolName: string): string | undefined;
export declare function getGenericSearchToolNames(): string[];
//# sourceMappingURL=platformMetadata.d.ts.map