import type { Searchers } from '../../core/searchers.js';
import type { SemanticSnippetSearchArgs } from './types.js';
export declare function handleSemanticSnippets(args: SemanticSnippetSearchArgs, searchers: Searchers): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
}>;
//# sourceMappingURL=handler.d.ts.map