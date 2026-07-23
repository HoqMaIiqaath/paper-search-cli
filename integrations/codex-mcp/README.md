# Paper Research MCP

这是面向 Codex 的本地 MCP 适配层：启动时读取 `paper-search tools`，把当前
`paper-search-cli` 提供的全部工具及其 JSON Schema 动态暴露给 Codex，再通过
`paper-search run <tool> --json-args <json>` 安全调用。

项目仅提供本地 stdio 传输。

## 能力

- 自动跟随已安装 CLI 的工具目录，无需逐个手写 MCP 包装；
- 保留上游工具名、描述和输入 Schema；
- 额外提供 3 个高阶工作流工具：
  - `research_search_and_deduplicate`
  - `research_expand_citation_graph`
  - `research_get_capability_status`
- 未出现在 CLI 目录中的工具不能调用；
- 参数通过进程参数传递，不经过 Shell 拼接；
- PDF 下载只能写入 `PAPER_RESEARCH_DOWNLOAD_ROOT`；
- `download_with_fallback` 默认关闭 Sci-Hub，除非显式传入 `useSciHub: true`。

## 安装与验证

要求 Node.js 20 以上，并安装 `paper-search-cli`：

```powershell
npm install -g paper-search-cli
paper-search setup

cd paper-search-cli\integrations\codex-mcp
npm install
npm run check
```

检查 CLI：

```powershell
paper-search doctor --pretty
paper-search smoke --mock --pretty
paper-search tools
```

## 接入 Codex

构建后将本地 stdio MCP 注册到 Codex：

```powershell
$mcpEntry = (Resolve-Path .\dist\stdio.js).Path
codex mcp add paper-research -- node $mcpEntry
```

可选地限定下载目录：

```powershell
$downloadRoot = New-Item -ItemType Directory -Force ".\research"
$env:PAPER_RESEARCH_DOWNLOAD_ROOT = $downloadRoot.FullName
```

注册后重启 Codex 或开启新任务，让 MCP 工具目录重新加载。

## 使用方式

一般检索可直接让 Codex 选择工具：

```text
使用 paper-research 检索 2022 年以来 RAG 幻觉评估研究。
查询 Crossref、OpenAlex 和 Semantic Scholar，按 DOI 去重，
保留检索来源，并将摘要证据和全文证据分开标记。
```

需要某个上游 CLI 的具体能力时，可直接指定原始工具名，例如
`search_crossref`、`search_openalex`、`get_paper_references` 或
`download_with_fallback`。CLI 升级后，重启 MCP 即可加载新增工具。

Visualize 可以作为可选呈现层，用于引用网络、发表时间线、来源覆盖和证据矩阵；
它不参与论文检索或证据核验。

## 项目结构

- `src/catalog.ts`：校验 CLI 工具目录；
- `src/paper-search-runner.ts`：无 Shell 的 CLI 调用层；
- `src/server.ts`：动态 MCP 工具发现、调用白名单和下载保护；
- `src/stdio.ts`：Codex 使用的 stdio 入口；
- `skills/paper-research/`：研究流程、来源选择与证据等级规范。
