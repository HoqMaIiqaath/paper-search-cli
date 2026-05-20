# Paper Search CLI Platform Feasibility And Adapter Plan

## Goal

Evaluate and plan support for these platform names:

- `dblp`
- `ieee`
- `acm`
- `usenix`
- `openreview`
- `springerlink`

The implementation must avoid further scattering platform-specific code through core files, and it must leave a reusable adapter/registry path for future platforms.

## Implementation Result

Implemented in this branch/worktree.

New extension layer:

- `src/core/platformMetadata.ts` stores platform IDs, aliases, default `all` participation, direct tool names, config-key metadata, and supported option metadata.
- `src/core/tools.ts` generates registry-backed direct search tools from platform metadata.
- `src/core/schemas.ts` validates registered platform IDs and parses generated `search_<platform>` tools with a shared schema.
- `src/core/handleToolCall.ts` has one generic direct-search branch for registered tools.
- `src/services/MultiSourceSearchService.ts` now reads default sources and aliases from the registry metadata.

New platform adapters:

- `src/platforms/DBLPSearcher.ts`: official DBLP public API.
- `src/platforms/IEEESearcher.ts`: official IEEE Xplore Metadata API, gated by `IEEE_API_KEY`.
- `src/platforms/ACMSearcher.ts`: Crossref metadata proxy constrained to ACM DOI prefix `10.1145`.
- `src/platforms/USENIXSearcher.ts`: DBLP-backed USENIX metadata adapter.
- `src/platforms/OpenReviewSearcher.ts`: public OpenReview notes search.
- `springerlink`: registry alias to the existing `SpringerSearcher`.

New public tool/platform names:

- `search_dblp`, `platform=dblp`
- `search_ieee`, `platform=ieee`
- `search_acm`, `platform=acm`
- `search_usenix`, `platform=usenix`
- `search_openreview`, `platform=openreview`
- `search_springerlink`, `platform=springerlink`

## Current Local Status

Already supported:

- `springer` via `SpringerSearcher`

Not currently supported:

- `dblp`
- `ieee`
- `acm`
- `usenix`
- `openreview`
- `springerlink` alias

Current coupling points:

- `src/core/searchers.ts` manually imports and instantiates every platform.
- `src/core/schemas.ts` manually maintains platform enums, tool names, and parser switches.
- `src/core/tools.ts` manually defines the public tool schema list.
- `src/core/handleToolCall.ts` has one switch case per direct search tool.
- `src/services/MultiSourceSearchService.ts` separately stores default all-source lists and aliases.
- `src/core/diagnostics.ts` stores provider requirements and tool-to-platform mapping separately.

Adding six platforms by repeating this pattern would increase drift risk. The first implementation step should be a small registry layer.

## GitHub And Official Source Findings

### DBLP

Feasibility: high.

Recommended approach:

- Direct [DBLP public API](https://dblp.org/faq/How+to+use+the+dblp+search+API).
- Endpoint: `https://dblp.org/search/publ/api`.
- No API key.
- Use `format=json`, `h`, `f`; optionally use venue API for venue resolution.

GitHub findings:

- [`Licheam/dblp-bibtex`](https://github.com/Licheam/dblp-bibtex): lightweight DBLP API proxy using `search/publ/api`, `search/venue/api`, and `rec/<key>.bib`.
- [`BaseCS/dblp_api`](https://github.com/BaseCS/dblp_api): DBLP-derived Neo4j API; useful as a graph example, not suitable as a direct dependency.

Decision:

- Implement native `DBLPSearcher` directly against official DBLP endpoints.
- Do not add a third-party dependency.

### IEEE

Feasibility: high with key, no-key unavailable.

Recommended approach:

- Direct [IEEE Xplore Metadata API](https://developer.ieee.org/docs/read/Searching_the_IEEE_Xplore_Metadata_API).
- Endpoint: `https://ieeexploreapi.ieee.org/api/v1/search/articles`.
- Requires `IEEE_API_KEY`.
- Support `querytext`, `article_title`, `author`, `publication_year`, `start_record`, `max_records`, `sort_field`, `sort_order`.

GitHub findings:

- Repositories such as [`cxsmarkchan/ieee-crawler`](https://github.com/cxsmarkchan/ieee-crawler) and similar projects are web crawlers for IEEE Xplore pages.
- I did not verify a strong maintained Node client worth adding as a dependency.

Decision:

- Use official API, not crawler code.
- Add diagnostics/config support for `IEEE_API_KEY`.

### ACM

Feasibility: medium.

Recommended approach:

- Do not scrape `/search` or ACM web search pages.
- [ACM `robots.txt`](https://dl.acm.org/robots.txt) disallows `/search/`.
- Official public ACM search API access was not confirmed from accessible official docs.
- Use Crossref/OpenAlex metadata constrained to ACM DOI prefix `10.1145`, with ACM DL DOI URLs in output.

GitHub findings:

- [`niklasekstrom/acmdownload`](https://github.com/niklasekstrom/acmdownload): ACM DL metadata crawler; README warns that parallel/bulk access can trigger temporary blocks.
- Other ACM/IEEE spider projects exist, but they are crawler-oriented and not appropriate for default CLI integration.

Decision:

- Implement `ACMSearcher` as a metadata-backed adapter using Crossref first.
- Document it as "ACM metadata search", not a first-party ACM DL API integration.
- Leave room for future `ACM_API_KEY` provider if a real institutional API contract is supplied.

### USENIX

Feasibility: medium.

Recommended approach:

- Do not scrape `https://www.usenix.org/search`; [official `robots.txt`](https://www.usenix.org/robots.txt) disallows `/search`.
- Prefer DBLP-backed search filtered to USENIX venues/URLs.
- Optional future enhancement: curated proceedings index generated from allowed conference/proceedings pages only after checking robots and rate limits.

GitHub findings:

- [`Kyle-Kyle/top4grep`](https://github.com/Kyle-Kyle/top4grep): local grep database for top security conferences including USENIX; useful model for an offline/curated index, not a generic live search source.
- Other security-paper crawlers exist, but they are conference-list crawlers rather than stable APIs.

Decision:

- Implement `USENIXSearcher` as DBLP-backed and conservative.
- Do not use USENIX `/search` HTML scraping.

### OpenReview

Feasibility: high.

Recommended approach:

- Use OpenReview API directly from TypeScript.
- Endpoint pattern verified: [`https://api.openreview.net/notes/search?term=<query>&limit=<n>`](https://api.openreview.net/notes/search?term=transformer&limit=1).
- Also support API2 where useful, because API2 returns newer `{ value }` content fields for DBLP-like public notes.

GitHub findings:

- [`openreview/openreview-py`](https://github.com/openreview/openreview-py): official Python client.
- [`openreview/openreview-js`](https://github.com/openreview/openreview-js): official Node.js packages for OpenReview API communication.

Decision:

- Implement native `OpenReviewSearcher` with direct HTTP calls, borrowing content-shape handling from official clients conceptually.
- Do not add `openreview-js` unless direct HTTP becomes too brittle.

### SpringerLink

Feasibility: high as alias.

Recommended approach:

- Treat `springerlink` as an alias for existing `springer`.
- Existing `SpringerSearcher` already uses Springer Nature metadata/open-access APIs.

GitHub findings:

- [`springernature/springernature_api_client`](https://github.com/springernature/springernature_api_client): official Python client covering metadata, open access, and TDM APIs.
- Local `SpringerSearcher` already follows the same API-family approach.

Decision:

- Add `springerlink` alias to the registry, not a duplicate searcher.

## Implemented Adapter Architecture

### Core metadata type

The implemented minimal registry is `src/core/platformMetadata.ts`:

```ts
export interface PlatformMetadata {
  id: string;
  aliases?: string[];
  displayName: string;
  sourceKind: 'official-api' | 'metadata-proxy' | 'html' | 'alias';
  defaultInAll: boolean;
  directTool?: boolean;
  toolName?: string;
  configKeys?: string[][];
  optionalConfigKeys?: string[][];
  supportedOptions: (keyof SearchOptions)[];
  description?: string;
}
```

It intentionally stores metadata only, rather than moving every searcher factory in one step. Helper functions expose:

```ts
resolvePlatformId(platform)
isKnownSearchPlatform(platform)
getDefaultAllSources()
getAliasMap()
getGenericSearchToolPlatform(toolName)
```

### Registration rule

Each platform adds only one definition entry plus one adapter file:

```ts
{
  id: 'dblp',
  aliases: [],
  displayName: 'DBLP',
  sourceKind: 'official-api',
  defaultInAll: true,
  directTool: true,
  toolName: 'search_dblp',
  supportedOptions: ['maxResults', 'year', 'author', 'journal', 'sortBy', 'sortOrder']
}
```

Alias-only entries, such as `springerlink`, resolve to the existing `springer` instance.

### Core file changes

Implemented now:

- `search_papers` platform validation comes from registry IDs plus aliases.
- direct `search_<platform>` tools are generated from registry metadata.
- `handleToolCall` has one generic branch for registry-backed search tools.
- `MultiSourceSearchService` reads `defaultInAll` and alias maps from registry metadata.
- diagnostics recognizes `IEEE_API_KEY` and generic tool-to-platform mapping.

Still intentionally manual:

- `initializeSearchers()` still instantiates concrete searchers explicitly. This keeps the current class wiring obvious and avoids a broad factory refactor in the same change. A later cleanup can move factories into the registry once these adapters settle.

Future incremental cleanup:

1. Move searcher factories into registry definitions.
2. Move diagnostics key requirements fully into registry definitions.
3. Add per-platform schemas only when a generic schema is no longer sufficient.

## Platform Implementation Scope

### New adapters

- `src/platforms/DBLPSearcher.ts`
- `src/platforms/IEEESearcher.ts`
- `src/platforms/ACMSearcher.ts`
- `src/platforms/USENIXSearcher.ts`
- `src/platforms/OpenReviewSearcher.ts`

No new adapter for `springerlink`; use alias to `springer`.

### Config

Add:

- `IEEE_API_KEY`

Reserve but do not enable by default:

- `ACM_API_KEY`

No keys:

- `dblp`
- `acm` metadata-proxy mode
- `usenix` DBLP-backed mode
- `openreview` public note search
- `springerlink` shares `SPRINGER_API_KEY`

## Validation Run

Static and unit validation passed:

- `npm exec tsc -- --noEmit`
- `npm run lint`
- `npm test -- --runInBand`: 28 suites passed, 239 tests passed.
- `npm run build`

No-key smoke tests passed:

- `node dist/cli.js search "transformer" --platform dblp --max-results 1 --pretty`
- `node dist/cli.js search "programming languages" --platform acm --max-results 1 --pretty`
- `node dist/cli.js search "file systems" --platform usenix --max-results 1 --pretty`
- `node dist/cli.js search "transformer" --platform openreview --max-results 1 --pretty`
- `node dist/cli.js run search_dblp --arg query="transformer" --arg maxResults=1 --pretty`
- `node dist/cli.js run search_acm --arg query="programming languages" --arg maxResults=1 --pretty`
- `node dist/cli.js run search_usenix --arg query="file systems" --arg maxResults=1 --pretty`
- `node dist/cli.js run search_openreview --arg query="transformer" --arg maxResults=1 --pretty`
- `node dist/cli.js tools --pretty` includes `search_dblp`, `search_ieee`, `search_acm`, `search_usenix`, `search_openreview`, and `search_springerlink`.

Key-gated smoke tests:

- `node dist/cli.js search "wireless networks" --platform ieee --max-results 1 --pretty` correctly fails with a missing `IEEE_API_KEY` diagnostic in this environment.
- `node dist/cli.js search "machine learning" --platform springerlink --max-results 1 --pretty` reaches the existing Springer adapter, but the locally configured Springer key is rejected by the provider with HTTP 401. This validates alias routing, but not successful Springer provider credentials.

Registry behavior tests:

- alias resolution: `springerlink -> springer`
- source parsing: `--sources dblp,openreview,springerlink`
- `all` follows the existing project behavior: it includes registered search sources, including key-gated sources, and reports missing-key/provider failures per source without aborting other sources.
- generated direct tools include `search_dblp`, `search_ieee`, `search_acm`, `search_usenix`, `search_openreview`

## Rollback

- Revert the registry/adapters/doc commits.
- No global config files should be edited.
- No credentials should be added to the repository.
- Third-party GitHub code should not be vendored.
