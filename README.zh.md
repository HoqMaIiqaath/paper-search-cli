# Paper Search for Codex

简体中文 | [English](README.md)

`paper-search-codex` 是面向 Codex 的本地 stdio MCP Server 与研究 Skill。
它把上游
[`paper-search-cli`](https://github.com/dr-dumpling/paper-search-cli)
运行时提供的完整工具目录暴露给 Codex，并增加可追溯检索、去重、引文扩展和
能力状态工作流。

这个 fork 现在是半独立项目：

- 本仓库维护 MCP Server、Codex Skill、安全策略、测试和独立版本；
- 上游 CLI 作为固定版本的 npm 运行依赖，不再复制整份上游源码；
- MCP 启动时动态读取 `paper-search tools`，兼容的上游新工具在依赖升级后会
  自动出现，不需要逐个手写包装。

当前适配版本为 `0.1.0`，固定的上游 CLI 版本为 `0.3.4`。

## 能力

- 暴露 CLI 实际报告且策略允许的全部工具，并保留原始工具名、描述和 JSON Schema，
  仅对安全默认值做收紧；
- 增加 `research_search_and_deduplicate`、
  `research_expand_citation_graph` 和
  `research_get_capability_status`；
- 提供 `paper-research` Skill，规范来源选择、可复现检索、证据等级和可选可视化；
- 使用 `execFile` 与参数数组调用 CLI，不经过 Shell；
- 将 PDF 写入限制在 `PAPER_RESEARCH_DOWNLOAD_ROOT`；
- 默认隐藏会直接或隐式访问 Sci-Hub 的工具；fallback 还必须在单次调用中传入
  `useSciHub: true`。

Visualize 可以把经过归一化和限量的数据呈现为引文网络、发表时间线、来源覆盖或
证据矩阵。它只负责呈现，不替代论文检索和证据核验。

## 安装

需要 Node.js 20 以上、npm 和 Codex。

```powershell
git clone https://github.com/HoqMaIiqaath/paper-search-cli.git paper-search-codex
cd paper-search-codex
npm ci
npm run check
```

npm 会同时安装固定版本的 `paper-search-cli`，不再要求单独全局安装。

通过随包安装的 CLI 配置可选凭据：

```powershell
npx paper-search setup
npx paper-search doctor --pretty
npx paper-search smoke --mock --pretty
```

多数元数据来源不需要 API key。`doctor` 会报告缺失或降级的可选能力，并对已经
配置的密钥进行脱敏。

## 接入 Codex

构建并注册 stdio MCP：

```powershell
npm run build
$mcpEntry = (Resolve-Path .\dist\stdio.js).Path
codex mcp add paper-search -- node $mcpEntry
```

可选地在启动 Codex 前设置下载边界：

```powershell
$downloadRoot = New-Item -ItemType Directory -Force ".\research"
$env:PAPER_RESEARCH_DOWNLOAD_ROOT = $downloadRoot.FullName
```

默认情况下不会出现 Sci-Hub 路由。只有本地法律、机构政策和用户授权均允许时，
才在启动 Codex 前显式开启：

```powershell
$env:PAPER_SEARCH_ENABLE_SCIHUB = "true"
```

这会暴露直接 Sci-Hub 工具；`download_with_fallback` 仍只有在单次调用同时传入
`useSciHub: true` 时才会使用 Sci-Hub。

修改 MCP 注册后，重启 Codex 或新建任务。示例：

```text
使用 paper-search 检索 2022 年以来 RAG 幻觉评估研究。
分别查询 Crossref、OpenAlex 和 Semantic Scholar，按稳定标识符去重，
保留每条记录的来源，并区分摘要证据和全文证据。
```

## 命名与版本

| 项目 | 名称 | 版本策略 |
| --- | --- | --- |
| npm 项目 / Codex 插件 | `paper-search-codex` | 独立 semver，当前 `0.1.0` |
| MCP Server | `paper-search` | 跟随适配项目版本 |
| Codex Skill | `paper-research` | 面向研究工作流的触发名称 |
| 运行引擎 | `paper-search-cli` | `package.json` 中固定的上游 npm 版本 |

`paper-search` 表示工具端点；`paper-research` 表示教 Codex 如何使用这些工具的
研究工作流，两者职责不同。

## 与上游同步

`.github/workflows/sync-upstream.yml` 每周运行一次，也支持手动触发。它会：

1. 用 `npm view paper-search-cli version` 比较当前固定版本和 npm 最新版；
2. 只有发现新版本时才更新 `package.json` 与 `package-lock.json`；
3. 构建并运行完整 MCP 测试；
4. 验证通过后，仅在这个 fork 内创建升级分支和 PR。

兼容的 CLI 更新不需要 Codex 修改。如果上游改变了 CLI 命令或工具目录契约，
仍需要人工审查；测试失败时自动流程不会创建 PR。

定时任务要求该 workflow 位于 fork 的默认分支。仓库 Actions 设置需要允许
workflow 写入，以及允许 GitHub Actions 创建 PR；不需要个人访问令牌。

## 开发

```powershell
npm ci
npm run check
npm start
```

目录职责：

- `src/`：MCP Server、CLI 解析、结果归一化和研究工作流；
- `tests/`：单元、包入口、MCP 协议和同步契约测试；
- `skills/paper-research/`：Codex 研究流程和按需读取的参考资料；
- `.codex-plugin/` 与 `.mcp.json`：Codex 插件元数据和 MCP 注册；
- `examples/`：用于工作流及可视化测试的限量示例数据。

只有测试其他 CLI 可执行文件时才设置 `PAPER_SEARCH_BINARY`。正常运行会优先解析
本项目固定的本地依赖，必要时才 fallback 到全局 `paper-search` 命令。

`package.json` 还固定了经过审计的传递依赖安全修复。在上游 CLI 或 MCP SDK 的
直接依赖范围包含安全版本之前，升级时应保留这些 overrides。

## 使用边界

部分来源、出版商 API、机构订阅、TDM 服务和 PDF 获取路径受平台条款或本地法律
约束。只有在具备相应访问权和授权时才配置、调用受限来源。

## 许可证

MIT。运行引擎仍来自上游
[`paper-search-cli`](https://github.com/dr-dumpling/paper-search-cli)
npm 包，并保留其自身项目历史和署名。
