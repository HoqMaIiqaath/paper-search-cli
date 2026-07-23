# Paper Search for Codex

[简体中文](README.zh.md) | English

`paper-search-codex` is a local stdio MCP server and Codex Skill for academic
literature research. It exposes the complete runtime tool catalog from
[`paper-search-cli`](https://github.com/dr-dumpling/paper-search-cli) to Codex,
then adds evidence-aware search, deduplication, citation expansion, and
capability-status workflows.

This fork is intentionally semi-independent from upstream:

- this repository owns the MCP server, Codex Skill, safety policy, tests, and
  release version;
- the upstream CLI is a pinned npm runtime dependency rather than copied source;
- MCP tools are discovered dynamically from `paper-search tools`, so compatible
  upstream tools appear after a dependency update without handwritten wrappers.

Current adapter version: `0.1.0`. Current pinned CLI version: `0.3.4`.

## Capabilities

- exposes every permitted tool reported by the installed CLI with its original
  name, description, and JSON Schema, except for stricter safety defaults;
- adds `research_search_and_deduplicate`,
  `research_expand_citation_graph`, and
  `research_get_capability_status`;
- provides a `paper-research` Skill for source selection, reproducible search,
  evidence levels, and optional visualization;
- invokes the CLI with `execFile` and an argument array, never through a shell;
- restricts PDF writes to `PAPER_RESEARCH_DOWNLOAD_ROOT`;
- hides tools with implicit or direct Sci-Hub access unless the server is
  explicitly authorized; fallback downloads additionally require
  `useSciHub: true`.

Visualize can present bounded normalized results as citation networks,
publication timelines, source coverage, or evidence matrices. It is a
presentation layer and does not replace retrieval or evidence verification.

## Install

Requirements: Node.js 20 or later, npm, and Codex.

```powershell
git clone https://github.com/HoqMaIiqaath/paper-search-cli.git paper-search-codex
cd paper-search-codex
npm ci
npm run check
```

The npm install includes the pinned `paper-search-cli`; a separate global CLI
installation is not required.

Configure optional provider credentials through the bundled CLI:

```powershell
npx paper-search setup
npx paper-search doctor --pretty
npx paper-search smoke --mock --pretty
```

Most metadata sources work without keys. `doctor` reports which optional
capabilities are unavailable or degraded and masks configured secrets.

## Connect Codex

Build and register the stdio server:

```powershell
npm run build
$mcpEntry = (Resolve-Path .\dist\stdio.js).Path
codex mcp add paper-search -- node $mcpEntry
```

Optionally choose a download boundary before starting Codex:

```powershell
$downloadRoot = New-Item -ItemType Directory -Force ".\research"
$env:PAPER_RESEARCH_DOWNLOAD_ROOT = $downloadRoot.FullName
```

Sci-Hub routes remain absent by default. If local law, institutional policy,
and the user's authorization permit them, opt in before starting Codex:

```powershell
$env:PAPER_SEARCH_ENABLE_SCIHUB = "true"
```

This exposes direct Sci-Hub tools. `download_with_fallback` still uses Sci-Hub
only when the individual call also passes `useSciHub: true`.

Restart Codex or create a new task after changing MCP registration. Example:

```text
Use paper-search to find studies since 2022 on evaluating RAG hallucinations.
Search Crossref, OpenAlex, and Semantic Scholar separately, deduplicate by stable
identifiers, preserve source provenance, and distinguish abstract evidence from
full-text evidence.
```

## Names and versions

| Item | Name | Version policy |
| --- | --- | --- |
| npm project / Codex plugin | `paper-search-codex` | Independent semver, currently `0.1.0` |
| MCP server | `paper-search` | Follows the adapter version |
| Codex Skill | `paper-research` | Workflow-oriented trigger name |
| Runtime engine | `paper-search-cli` | Exact upstream npm version in `package.json` |

The names distinguish the tool endpoint (`paper-search`) from the research
workflow that teaches Codex how to use it (`paper-research`).

## Upstream synchronization

`.github/workflows/sync-upstream.yml` runs weekly and can also be started
manually. It:

1. compares the pinned dependency with `npm view paper-search-cli version`;
2. updates `package.json` and `package-lock.json` only when a newer version
   exists;
3. builds and runs the complete MCP test suite;
4. creates an update branch and PR inside this fork only when validation passes.

This handles compatible CLI releases without Codex edits. A breaking change to
the CLI command or tool-catalog contract still requires human review; failing
tests prevent an automated PR from being created.

For scheduled runs, this workflow must exist on the fork's default branch.
Repository Actions settings must allow workflow write access and GitHub Actions
to create pull requests. No personal access token is required.

## Development

```powershell
npm ci
npm run check
npm start
```

Project layout:

- `src/`: MCP server, CLI resolver, normalization, and research workflows;
- `tests/`: unit, package, protocol, and synchronization-contract tests;
- `skills/paper-research/`: Codex research workflow and focused references;
- `.codex-plugin/` and `.mcp.json`: Codex plugin metadata and MCP registration;
- `examples/`: bounded sample data for workflow and visualization testing.

Set `PAPER_SEARCH_BINARY` only when testing a different CLI executable. The
normal runtime resolves the pinned local dependency first and falls back to a
global `paper-search` command only when necessary.

`package.json` also pins audited transitive security fixes. Keep those overrides
when updating the upstream CLI or MCP SDK until their direct dependency ranges
include the fixed releases.

## Usage boundaries

Some providers, publisher APIs, institutional subscriptions, TDM services, and
PDF routes are subject to terms or local law. Configure and use restricted
sources only when you have the relevant rights and authorization.

## License

MIT. The runtime engine remains the upstream
[`paper-search-cli`](https://github.com/dr-dumpling/paper-search-cli) package and
retains its own project history and attribution.
