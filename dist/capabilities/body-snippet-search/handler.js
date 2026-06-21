import { searchBodySnippets } from './service.js';
function jsonTextResponse(text) {
    return {
        content: [
            {
                type: 'text',
                text
            }
        ]
    };
}
export async function handleSemanticSnippets(args, searchers) {
    const results = await searchBodySnippets(searchers, args);
    const bodyCount = results.filter(result => result.snippet.snippetKind === 'body').length;
    return jsonTextResponse(`Found ${results.length} Semantic Scholar snippet(s), including ${bodyCount} body snippet(s).\n\n${JSON.stringify(results, null, 2)}`);
}
//# sourceMappingURL=handler.js.map