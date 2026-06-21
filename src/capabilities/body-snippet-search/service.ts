import type { Searchers } from '../../core/searchers.js';
import type { SemanticSnippetResult, SemanticSnippetSearchArgs } from './types.js';

export async function searchBodySnippets(
  searchers: Searchers,
  args: SemanticSnippetSearchArgs
): Promise<SemanticSnippetResult[]> {
  return searchers.semantic.searchSnippets(args);
}
