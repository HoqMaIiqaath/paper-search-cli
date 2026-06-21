# paper-search-cli 项目架构总结

> 本文用中文说明 `paper-search-cli` 当前是如何构建的：它是什么、分成哪几层、一条命令从输入到输出经过哪些环节。基于 `src/` 源码（v0.3.0）整理，便于快速看懂全局。

---

## 1. 这是个什么项目

一个**面向 AI Agent 的学术文献检索与下载命令行工具（CLI）**。

- 语言/运行时：TypeScript + Node.js（`>=18`），ESM 模块，编译产物在 `dist/`。
- 入口可执行文件：`paper-search`（`package.json` 的 `bin` 指向 `dist/cli.js`）。
- 核心能力：在 **20+ 个学术数据源**（Crossref、PubMed、arXiv、OpenAlex、Semantic Scholar、Web of Science、Springer……）里统一检索论文、查期刊指标、按多级回退策略下载 PDF。
- 设计取向：输出**默认是 JSON**，方便 Agent 解析；同时附带一个可被 Agent 运行时安装的 **Skill**（路由说明），让 Agent 知道何时、如何调用这个 CLI。

一句话概括它的分层思路：**“文献检索领域” 与 “友好管理层（健康检查/配置/Skill 安装）” 分离**——前者负责真正搜论文，后者负责让工具可被正确配置和发现。

---

## 2. 顶层目录速览

```
paper-search-cli/
├── src/                  # 全部 TypeScript 源码（下文重点）
│   ├── cli.ts            # CLI 入口：解析参数、分发命令、渲染输出
│   ├── core/             # 核心编排层（工具定义、调用分发、诊断、能力画像）
│   ├── platforms/        # 各学术平台的 Searcher（每个数据源一个类）
│   ├── services/         # 跨平台业务服务（多源搜索、下载回退、引用、期刊指标）
│   ├── config/           # 配置与密钥管理、结果上限
│   ├── utils/            # 基础设施（HTTP、限流、缓存、错误、安全、PDF）
│   ├── skills/           # Skill 安装器（把 Bundled Skill 写入 Agent 目录）
│   └── models/Paper.ts   # 统一的论文数据模型
├── skills/paper-search/  # 随包发布的 Skill（SKILL.md + references/）
├── docs/adr/             # 架构决策记录（ADR）
├── tests/                # Jest 测试，目录结构镜像 src/
├── dist/                 # tsc 编译产物（发布用）
└── package.json / tsconfig.json / .env.example
```

---

## 3. 分层架构

整个项目可以看成**自上而下 6 层**，依赖方向单向向下：

```
①  CLI 入口层          src/cli.ts
        │  解析命令 → 调用 core / services
        ▼
②  核心编排层          src/core/   (tools, handleToolCall, schemas,
        │                          capabilityProfile, diagnostics ...)
        ▼
③  业务服务层          src/services/ (MultiSource, OpenAccessFallback,
        │                            Citation, JournalMetrics)
        ▼
④  平台适配层          src/platforms/ (每个数据源一个 Searcher，
        │                            统一继承 PaperSource 抽象基类)
        ▼
⑤  基础设施层          src/utils/  (HttpClient, RateLimiter, RequestCache,
        │                          ErrorHandler, SecurityUtils, PdfDownload)
        ▼
⑥  配置与模型          src/config/ + src/models/Paper.ts
```

旁挂两条支线，不参与文献检索主流程：

- **友好管理层（管理支线）**：`config` / `doctor` / `status` / `smoke` / `skills` / `setup` 等命令，负责配置、健康检查与 Skill 安装。
- **Skill 分发**：`src/skills/SkillInstaller.ts` + `skills/paper-search/`，把使用说明分发给 Agent 运行时。

### 各层职责

| 层 | 关键文件 | 职责 |
|----|----------|------|
| ① CLI 入口 | `cli.ts` (984 行) | 手写参数解析（无三方 CLI 框架），按 `command` 字符串分发到各处理函数，统一渲染 JSON / text 输出 |
| ② 核心编排 | `core/tools.ts`、`core/handleToolCall.ts`、`core/schemas.ts` | 定义 Agent 可调用的工具清单、用 Zod 校验入参、把工具调用路由到对应平台或服务 |
| ② 核心编排 | `core/capabilityProfile.ts`、`core/diagnostics.ts`、`core/platformMetadata.ts`、`core/liveSmoke.ts` | 能力画像、错误诊断、平台元数据注册表、联网自检 |
| ③ 业务服务 | `services/MultiSourceSearchService.ts` | 多源并发搜索 + 去重 + 结果聚合 |
| ③ 业务服务 | `services/OpenAccessFallbackService.ts` | PDF 多级回退下载漏斗 |
| ③ 业务服务 | `services/JournalMetricsService.ts`、`CitationService.ts` | 期刊影响因子/分区查询、引用格式化 |
| ④ 平台适配 | `platforms/PaperSource.ts` + 24 个 Searcher | 抽象基类 + 各数据源的具体实现 |
| ⑤ 基础设施 | `utils/*` | 全局代理设置、限流、缓存、错误处理、脱敏、PDF 下载/解析；当前尚未形成统一 HTTP 客户端 |
| ⑥ 配置模型 | `config/ConfigService.ts`、`models/Paper.ts` | 密钥/环境变量管理、统一论文数据结构 |

---

## 4. 核心抽象：`PaperSource` 与平台注册表

这是整个项目最重要的设计，理解它就理解了一半。

### 4.1 `PaperSource` 抽象基类（`platforms/PaperSource.ts`）

所有数据源都继承自这个抽象类，强制实现三个核心方法：

- `search(query, options)` → 返回 `Paper[]`
- `downloadPdf(paperId, options)` → 返回下载路径
- `readPaper(paperId, options)` → 返回全文文本
- `getCapabilities()` → 声明该平台支持搜索/下载/全文/被引/是否需密钥

基类还提供公共能力：错误处理委托、重试判断、日期解析、文本清洗、文件名提取等。**新增一个数据源的算法适配主要是写一个继承 `PaperSource` 的新类**；但在当前架构下，还需要同步更新工具清单、schema、能力画像、实例化和 PDF fallback 源等多处手写登记（见 §4.2）。

目前已有 24 个 Searcher，按来源性质分四类（见 `platformMetadata.ts` 的 `sourceKind`）：

- `official-api`：官方 API（Crossref、OpenAlex、PubMed、arXiv、Semantic Scholar……）
- `metadata-proxy`：元数据代理（Unpaywall、DBLP……）
- `html`：网页抓取（Google Scholar、Sci-Hub……，用 `cheerio` 解析）
- `alias`：同一实现的别名（如 `wos` = `webofscience`，`scholar` = `googlescholar`）

### 4.2 平台注册表（`core/platformMetadata.ts`）

一张 `PLATFORM_METADATA` 表集中描述每个平台：`id`、别名、显示名、来源类型、是否进入 `--sources all`、所需/可选配置 key、支持的搜索选项。

它已经是平台注册表的雏形：别名解析、`all` 默认源列表和部分工具/配置逻辑会读这张表。但它还不是完整的单一事实来源；工具清单、schema、能力画像、实例化和 PDF fallback 源仍有多处手写枚举。

### 4.3 Searcher 实例化（`core/searchers.ts`）

`initializeSearchers()` 一次性 `new` 出所有 Searcher（单例缓存），从 `process.env` 注入各平台密钥，返回一个 `Searchers` 字典对象。后续所有搜索/下载都从这个字典按 `id` 取实例。

### 4.4 统一数据模型 `Paper`（`models/Paper.ts`）

无论来自哪个源，结果都归一化成同一个 `Paper` 结构（`paperId`/`title`/`authors`/`doi`/`pdfUrl`/`source`……）。`PaperFactory.toDict()` 负责序列化成 Agent 友好的 JSON。

---

## 5. 三条主要数据流

### 5.1 多源搜索（`search --sources all`）

```
cli.ts (command=search)
  → searchMultipleSources()              [services/MultiSourceSearchService.ts]
      → parseSourceList()                解析 / 别名归一 / 过滤出有效源
      → Promise.allSettled(各源并发 search)，每个源带超时 withTimeout()
      → 失败的源记入 errors/failed_sources，不影响其它源（容错）
      → dedupePapers()                   按 DOI → 标题+作者 → 源内 id 去重
  → 返回 { sources_used, source_results, errors, total, papers[] }
```

要点：**并发 + 单源超时隔离 + 部分失败不致命 + 跨源去重**。这是“先建列表、再下载”两段式工作流的第一段。

### 5.2 单工具调用（`run <tool> --arg ...`）

```
cli.ts (command=run)
  → handleToolCall(toolName, args, searchers)   [core/handleToolCall.ts]
      → parseToolArgs()  用 Zod schema 校验并归一入参   [core/schemas.ts]
      → 按 toolName 路由：
          · 通用搜索工具  → 对应平台 searcher.search()
          · DOI/PMID 定位 → 在 DOI_LOOKUP_SOURCES 里查
          · 下载           → downloadWithFallback()
          · 期刊指标       → queryJournalMetrics()
  → 统一包成 { content:[{type:'text', text}] } 返回
```

`core/tools.ts` 定义了暴露给 Agent 的全部工具清单（`paper-search tools` 可列出），schema 与平台注册表保持一致。

### 5.3 PDF 下载回退漏斗（`OpenAccessFallbackService.ts`）

下载不是“一次成功或失败”，而是一个**逐级回退漏斗**，每一步都记录 `attempts`：

```
1. primary          源自身的下载器（若支持 download）
2. direct_pdf_url   源元数据里带的 pdf_url
3. repositories     PMC / EuropePMC / CORE / OpenAIRE 仓库兜底
4. unpaywall        按 DOI 解析开放获取 PDF
5. scihub           最终兜底（可用 useSciHub=false 关闭）
```

对应 CONTEXT.md 里的概念：开放获取源（Open Access）、权属访问源（Entitled Access）、Sci-Hub 兜底三类分开管理。

---

## 6. 友好管理层（管理支线）

这条支线**不搜论文**，专门让工具“可被正确使用”，是本项目区别于普通爬虫脚本的地方（见 ADR-0003）：

- **`config`**：`init/set/get/unset/list/doctor/path/import-env/keys` —— 管理密钥与环境变量（`config/ConfigService.ts`），输出时密钥脱敏。
- **`doctor` / `status`**：健康报告，合并“脱敏配置 + 能力画像 + 平台状态”。
- **`capabilityProfile`**：把底层“哪些密钥配了”翻译成**面向用户的能力**（`metadata_search` / `citation_expansion` / `body_snippet_search` / `journal_metrics` / `pdf_discovery` / `entitled_access`），每项给 `available/degraded/unavailable` 状态和原因。即使某个能力缺失，其它能力仍可用（能力降级而非整体失效）。
- **`smoke --mock|--live`**：离线自检（验证命令接线）或联网自检（`core/liveSmoke.ts`，跑一个免费源小查询 + Sci-Hub 可用性轻探测）。
- **`skills`** + **`setup`**：把随包的 Skill 安装到 Agent 运行时目录（见下节）。

---

## 7. Skill 分发机制

项目不仅是 CLI，还**随包携带一份 Skill**（`skills/paper-search/`，含 `SKILL.md` 和 `references/` 路由文档），用来告诉 Agent 何时调用本 CLL、如何遵守证据与密钥边界。

- `src/skills/SkillInstaller.ts` 负责：把 Bundled Skill **显式安装**到用户指定的 Agent Skill 目录（不做 postinstall 静默安装，见 ADR-0001），并能做 `status`（已装状态）、`diff`（与随包版本的差异，只比对受管文件）、`update`（同步）。
- 关键概念：Bundled Skill（随包）→ Installed Skill（已写入 Agent 目录）→ Managed Skill File（受包管理的文件）/ Extra Skill File（用户额外文件，更新时不删）。

这样 CLI 可执行文件与 Agent 使用说明**版本同步**，避免文档与实现脱节。

---

## 8. 基础设施层（`utils/`）

这里放的是平台会用到的横切工具，但当前还没有真正统一所有 HTTP 请求。多数平台仍各自直接使用 `axios`；`HttpClient.ts` 目前主要负责全局代理设置，统一请求包装层是目标架构里的改造方向。

| 文件 | 作用 |
|------|------|
| `HttpClient.ts` | 当前主要做全局代理设置（http/socks）；尚不是统一请求客户端 |
| `RateLimiter.ts` | 各平台限流，避免触发数据源风控 |
| `RequestCache.ts` | LRU 请求缓存，减少重复网络请求 |
| `QuotaManager.ts` | 配额管理 |
| `ErrorHandler.ts` | 统一错误分类、可重试判断、重试延迟 |
| `SecurityUtils.ts` | 请求脱敏（`maskSensitiveData`）、`withTimeout` 超时包装、输入清洗 |
| `PdfDownload.ts` / `PDFExtractor.ts` | PDF 下载与文本提取（`pdf-parse`） |
| `Logger.ts` | 调试日志 |

---

## 9. 配置与启动顺序

CLI 启动时（`cli.ts` 顶部）按固定顺序加载配置，优先级由低到高：

```
1. dotenv.config()            读取 .env 文件
2. loadUserConfigIntoEnv()    读取用户配置文件并注入 process.env
3. setupGlobalProxy()         按环境变量配置全局代理
```

密钥**只通过环境变量 / 用户配置文件 / .env 提供，绝不写入源码或 Skill**。`.env.example` 列出全部可配置项。所有平台密钥在 `initializeSearchers()` 时从 `process.env` 读取。

---

## 10. 构建、测试与发布

- **构建**：`npm run build` = 清理 `dist/` → `tsc` 编译 → 给 `dist/cli.js` 加可执行权限。
- **开发**：`npm run dev`（`tsx` 直跑 `src/cli.ts`，免编译）。
- **测试**：`npm test`（Jest + ts-jest，ESM 预设）。`tests/` 目录结构镜像 `src/`，覆盖各 Searcher、services、core、utils、skills 契约测试。
- **发布**：`prepublishOnly` 先跑测试再构建；`files` 字段只发布 `dist/`、两份 README、`skills/`、`LICENSE`、`.env.example`。

---

## 11. 设计决策（ADR 摘要）

`docs/adr/` 记录了三条关键决策：

- **ADR-0001 显式 Skill 安装**：不在 npm postinstall 里静默装 Skill，改为用户在 `setup`/`skills` 命令中显式确认安装目标，避免污染用户 Agent 目录。
- **ADR-0002 独立能力画像**：能力画像（Capability Profile）独立于具体平台名/密钥名，向用户描述“能做什么”而非“配了哪个 key”。
- **ADR-0003 友好管理层**：把配置/健康/Skill 管理等命令与文献检索领域**显式分层**，互不污染。

---

## 12. 一句话总结架构特征

1. **抽象基类 + 注册表雏形**：`PaperSource` 统一接口 + `platformMetadata` 承载部分平台事实源；目标是继续收敛散落枚举，降低新增数据源成本。
2. **领域与管理分离**：搜论文的逻辑和“让工具可用”的逻辑（配置/健康/Skill）清晰分层。
3. **容错优先**：多源并发带超时隔离、部分失败不致命、下载多级回退、能力降级而非整体失效。
4. **Agent 友好**：默认 JSON 输出、Zod 校验入参、随包分发 Skill、密钥全程脱敏。
```
