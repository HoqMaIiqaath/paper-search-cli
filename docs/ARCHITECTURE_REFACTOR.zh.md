# paper-search-cli 优化后的目标架构（三轴收敛）

> **本文描述的是"架构优化完成后应该长什么样"——即目标架构样貌，不是迁移步骤。**
> 配套阅读：[ARCHITECTURE.zh.md](./ARCHITECTURE.zh.md)（当前架构现状）。
> "每一步具体如何改造"由后续单独的子文档承载，本文只定义终点形态。

---

## 0. 配套执行文档

本文是目标架构总览。具体执行文档统一放在 [refactor/README.md](./refactor/README.md)。

- **当前准备执行**：`refactor/01-citation-tools.md` 到 `refactor/04-citation-tests-and-acceptance.md`，接入 `CitationService`，新增施引文献 / 参考文献工具，并在 PDF 下载模块预留 `DownloadTier` / `institutional_access` 接口。
- **未来进一步执行**：`refactor/future-webvpn-carsi-ezproxy.md`，在上述接口基础上，后续接入 WebVPN、CARSI、EZProxy、出版商机构登录和浏览器会话复用。

执行文档只定义阶段性落地范围；若与本文目标态冲突，以本文的三轴边界为准，并在执行前修正文档。

---

## 1. 优化要解决的三类问题

当前架构的 6 层骨架是合理的，但有三类债，分别对应三条不同的"轴"：

1. **数据源重复登记**：同一份平台清单散落在 7~8 个文件里（`searchers.ts`、`tools.ts`、`schemas.ts`、`handleToolCall.ts`、`capabilityProfile.ts`、`diagnostics.ts`、`OpenAccessFallbackService.ts`），加一个源要改一大片。
2. **功能模块边界模糊**：文献检索、期刊检索、PDF 下载、维护这四个功能混在 `services/` + `core/` 里，没有清晰的模块边界与依赖规则。
3. **横切基础设施不统一**：`HttpClient` 名不副实（只做代理设置），24 个平台各自 `import axios`，限流只有 13/24 接入、缓存只有 3/24、错误处理 3 个平台绕过，"忘了接某个横切能力"成为一整类 bug。

这三类债分别落在三条**互相垂直**的轴上。目标架构的本质，就是让这三条轴各自收敛、互不污染。

---

## 2. 核心心智模型：三条正交轴

```
   ③ 基础设施轴（横切，常规 HTTP 请求共用）
   HttpClient · 限流 · 缓存 · 重试 · 超时 · 错误 · UA
        ▲
        │  每个数据源声明自己的策略，统一 HttpClient 执行
        │
   ① 能力域轴 ──────────────┼──────────────────────────→  ② 数据源轴
   (功能维度)               │                              (注册表)
   文献检索 ────────────────┤ 用很多数据源                  crossref
   PDF下载  ────────────────┤ 用很多数据源(下载)             pubmed
   期刊检索 ────────────────┤ 只有 EasyScholar 一个源         arxiv
   维护     ────────────────┤ 没有数据源，检查别人            springer ...
```

- **轴① 能力域**：系统对外提供的 4 个功能，每个是独立模块（第 3 节）。
- **轴② 数据源**：20+ 个文献/下载来源，由注册表统一登记（第 4 节）。只有"文献检索"和"PDF 下载"坐落在这条轴上。
- **轴③ 基础设施**：常规 HTTP 请求共用的横切能力，由统一 HttpClient 承载（第 5 节）。浏览器自动化、复杂认证会话等特殊 adapter 不混入这条通用轴，但必须遵守脱敏、诊断和输出契约。

**判断一个东西归哪条轴**：它是"功能"→轴①；是"来源"→轴②；是"常规 HTTP 请求都要的横切能力"→轴③。

---

## 3. 轴① 能力域：四个功能分模块维护

### 3.1 四个功能的归属与依赖

| 功能 | 目标模块 | 依赖 | 与数据源注册表的关系 |
|------|---------|------|--------------------|
| **文献检索** | `MultiSourceSearchService` | 注册表 + platforms | 完全注册表驱动 |
| **PDF下载** | PDF 下载模块（可插拔下载层漏斗） | 注册表 + platforms（+ 自管漏斗） | 消费注册表的"可下载源"；漏斗设计为可插拔 `DownloadTier`，未来新下载方式只作为新层接入 |
| **期刊检索** | `JournalMetricsService` | 仅 EasyScholar（零注册表/零 platforms 依赖） | 不在注册表，完全独立 |
| **维护** | 管理层：`config/` + `core/diagnostics·capabilityProfile·liveSmoke` + `skills/` | 读取以上三者的状态 | 读注册表做报告，自己不是平台 |

### 3.2 模块边界规则（保证"改一处不影响全部"）

1. **文献检索 ↔ PDF下载 互不调用**：检索负责"建列表"、下载负责"按列表取 PDF"，两者通过 `Paper` 数据模型解耦。改下载漏斗顺序不影响检索。
2. **期刊检索完全隔离**：不进注册表、不依赖 platforms。换期刊指标供应商永远不动文献检索。
3. **维护层单向依赖**：它读其它模块的状态，但功能模块**不反向依赖**维护层。改 `doctor`/`skills` 永远不影响搜论文。

### 3.3 每个功能可有自己的小注册表（注册表是模式，不是一张全局大表）

为避免"一张大表绑死一切"，注册表按轴拆分，各管各的：

- **数据源注册表**（`platformMetadata`）：服务文献检索 + PDF 下载（第 4 节）。
- **下载层注册表（PDF 下载模块的扩展点，应在本次锁定）**：把回退漏斗做成一张有序的"下载层"表，每层实现统一接口 `DownloadTier`。现有层（源生→直链→仓库→Unpaywall→Sci-Hub）和未来层都只是注册进这张表的一条。加一层只改这张表、不动其它层。
- **期刊供应商注册表**（将来需要时）：若期刊检索要支持多家供应商，再建一张小表。现在只有 EasyScholar，不需要。

### 3.4 扩展点边界：未来接入机构 / WebVPN 权限下载（不在本次重构范围）

本节只用来约束接口边界，不定义具体实现方案。未来机构 / WebVPN 权限下载应作为 PDF 下载漏斗中的一个新 `DownloadTier` 接入，位置在开放获取层之后、Sci-Hub 兜底之前：

```text
源生下载 → 开放获取(直链/仓库/Unpaywall) → 未来权限访问层 → Sci-Hub 兜底
```

本次目标只锁定三条边界：

1. **外层接口**：PDF 模块必须允许新增 `DownloadTier`，不能把 fallback 顺序写死在一个长函数里。
2. **内部自治**：未来权限访问层可以有自己的方法处理器、用户 profile、数据文件和浏览器自动化，但这些细节只属于该下载层内部，不进入数据源注册表，也不污染通用 HttpClient。
3. **统一契约**：无论下载层内部如何实现，对外都必须返回同一种 attempts / path / error 结构，并对 URL、Cookie、会话凭据等敏感内容做脱敏。

---

## 4. 轴② 数据源：注册体系驱动（平台事实源收敛）

### 4.1 现状要消除的散落登记

优化后，平台相关的重复事实应由数据源注册体系派生，不再各写一份。注意：这里收敛的是**平台型能力**；`download_paper`、`download_with_fallback`、`search_semantic_snippets`、`query_journal_metrics`、`doctor/status/smoke/skills/config` 等工作流或维护工具，仍由各自能力域维护。

| 散落处 | 内容 |
|--------|------|
| `searchers.ts` | `Searchers` 接口字段 + 逐个 `new` |
| `tools.ts` | 平台型 `search_xxx` 工具块；工作流工具继续由能力域维护 |
| `schemas.ts` | 平台型搜索 schema；特殊工具保留能力域私有 schema |
| `handleToolCall.ts` | `DOI_LOOKUP_SOURCES` + 同模板平台搜索 case + `normalizeSource`（重造了 `resolvePlatformId`） |
| `capabilityProfile.ts` | 4 个硬编码源分组数组 |
| `diagnostics.ts` | `DIRECT_TOOL_PLATFORM` 映射（与 `toolName` 字段重复） |
| `OpenAccessFallbackService.ts` | `REPOSITORY_SOURCES` |

### 4.2 目标事实来源：数据源注册体系

```ts
export interface PlatformDescriptor {
  // —— 身份 ——
  id: string;                                  // 'arxiv'
  aliases?: string[];                          // 别名 → 自动派生别名键、删 searchers.ts 双套维护
  displayName: string;
  sourceKind: 'official-api' | 'metadata-proxy' | 'html' | 'alias';
  defaultInAll: boolean;

  // —— 工具与入参（派生 tools / schema / 路由）——
  directTool?: boolean;
  toolName?: string;                           // 派生路由，删 DIRECT_TOOL_PLATFORM
  description?: string;
  supportedOptions: (keyof SearchOptions)[];   // → 决定普通搜索工具 inputSchema 和 Zod schema 的主体形状
  optionCaps?: { maxResults?: number };        // 上限覆盖（arXiv=50，默认 100）
  schemaOverride?: 'google-scholar' | 'core' | 'scopus' | string;

  // —— 配置依赖（派生能力画像的 configured/missing）——
  configKeys?: string[][];
  optionalConfigKeys?: string[][];

  // —— 角色标签（消除散落源清单）——
  capabilityGroups?: CapabilityGroup[];        // 替代 capabilityProfile 的 4 个数组
  supportsDoiLookup?: boolean;                 // 替代 DOI_LOOKUP_SOURCES + get_paper_by_doi enum
  isRepository?: boolean;                      // 替代 REPOSITORY_SOURCES
}

type PlatformFactoryRegistry = Record<string, (env: NodeJS.ProcessEnv, http: HttpClient) => PaperSource>;
type HttpPolicyRegistry = Record<string, HttpPolicy>;

export type CapabilityGroup =
  | 'metadata_free' | 'metadata_entitled'
  | 'open_access' | 'entitled_access' | 'scihub';
```

概念上拆成三块：

- `PlatformDescriptor`：纯描述信息，负责平台身份、别名、工具名、配置依赖、能力标签和普通搜索参数。
- `PlatformFactoryRegistry`：运行时实例化信息，负责把平台 ID 映射到 Searcher 构造函数。
- `HttpPolicyRegistry`：请求策略信息，负责把平台 ID 映射到限流、缓存、超时、重试、UA 等策略。

物理文件可以后续再定；可以继续放在 `core/platformMetadata.ts`，也可以拆成 `platformRegistry.ts` / `httpPolicies.ts`。上层原则是：描述、实例化、请求策略在概念上分开，避免一张 metadata 表同时承担所有运行时职责。

`supportedOptions` 只覆盖普通搜索工具的主体参数。遇到 Google Scholar 年份范围、CORE 动态上限、Scopus 特殊枚举、Semantic snippets 这类非普通平台搜索能力时，应通过 `schemaOverride` 或能力域私有 schema 保留手写边界。

### 4.3 派生关系

```
数据源注册体系  ──┬──→ 平台型 search_xxx tools
                  ├──→ 普通平台搜索 Zod schema
                  ├──→ parseToolArgs 的平台搜索路由
                  ├──→ handleToolCall 的同模板平台搜索分发
                  ├──→ Searchers 字典（由 factory registry 组装）
                  ├──→ 能力画像分组（读 capabilityGroups）
                  ├──→ DOI 查找源 / 仓库源（读 supportsDoiLookup / isRepository）
                  └──→ 常规 HTTP 请求策略（读 HttpPolicyRegistry → 交给统一 HttpClient）
```

工作流工具、维护命令、期刊指标、正文片段检索和下载漏斗本身不从数据源注册表派生；它们由各自能力域的小注册表或显式代码维护。

---

## 5. 轴③ 基础设施：统一 HttpClient

### 5.1 现状问题

`utils/HttpClient.ts` 名不副实——只导出 `setupGlobalProxy()`。24 个平台全部各自 `import axios`，导致横切能力大面积不一致：限流 13/24、缓存 3/24、配额 4/24，重试/错误/超时/UA 各写各的。

### 5.2 目标形态：真正的请求包装层

`HttpClient` 升级为常规 HTTP 请求的统一客户端，把横切能力内建进去：

```ts
class HttpClient {
  constructor(policy: HttpPolicy) { /* 注入限流/缓存/重试/超时/UA/代理 */ }
  request<T>(config): Promise<T>   // 单一入口：自动限流 → 查缓存 → 发请求 → 重试 → 统一错误
}

interface HttpPolicy {
  rateLimit?: { rps: number; burst?: number };  // 不配则用默认
  cache?: { ttlMs: number };                     // 不配则不缓存
  timeoutMs?: number;                            // 默认 TIMEOUTS.DEFAULT
  retry?: { maxRetries: number };                // 默认走 ErrorHandler.retryWithBackoff
  userAgent?: string;                            // 默认统一 USER_AGENT；scraping 平台可覆盖
  validateStatus?: (s: number) => boolean;
}
```

目标态的关键约束：

- **平台的常规 API / HTML / 文件下载请求不再直接 `import axios`**，一律通过注入的 `HttpClient`。
- **每个平台的 HTTP 策略写在 `HttpPolicyRegistry` 里**（轴②与轴③在此对接）——例如 arXiv 声明 `{ rateLimit:{rps:0.33}, timeoutMs:10000 }`，Google Scholar/SciHub 声明 scraping UA。策略**只声明一次**，HttpClient 统一执行。
- **限流/缓存/重试/超时/错误/UA 从"每个平台自己记得接"变成"默认就有"**，彻底消除"忘了接 X"这一类 bug。
- 真正特殊的常规 HTTP 请求（SciHub 镜像探测、Wiley TDM 长超时）通过 `HttpPolicy` 覆盖表达，而非绕过统一层。
- 浏览器自动化、复杂认证会话等非普通 HTTP 场景可以通过专用 adapter 实现，但必须复用脱敏、诊断、错误分类和输出契约。

### 5.3 收益

| 横切能力 | 当前接入 | 目标态 |
|---------|---------|--------|
| 限流 | 13/24 手动 | 全部，默认生效 |
| 缓存 | 3/24 手动 | 全部，按 `http.cache` 声明 |
| 统一错误处理 | 21/24（3 个绕过） | 全部，无绕过 |
| 重试 / 超时 / UA | 各写各的 | 统一默认 + 注册表覆盖 |

---

## 6. 三轴如何协同（一次搜索请求的目标流向）

```
用户/Agent 调 search_arxiv
   │
   ▼ 轴① 能力域：路由到「文献检索」模块
MultiSourceSearchService
   │  从 轴② 数据源注册体系取 arxiv 的 descriptor / factory / HTTP policy
   ▼ 轴② 数据源：取得 ArxivSearcher 实例
ArxivSearcher.search()
   │  发请求时不直接用 axios
   ▼ 轴③ 基础设施：经注入的 HttpClient（按注册表 http 策略自动限流/缓存/重试/超时/错误）
返回归一化的 Paper[] → 去重 → JSON 输出（对外格式不变）
```

三条轴各管一段，互不越界：能力域决定"做什么"，数据源决定"用哪个来源 + 该来源的策略"，基础设施决定"请求怎么稳妥发出去"。

---

## 7. 优化后的目录/文件职责（目标态）

| 路径 | 目标职责 | 所在轴 |
|------|---------|--------|
| `core/platformMetadata.ts` | 平台描述事实源：身份、别名、工具名、配置依赖、能力标签、普通搜索参数 | ② |
| `core/platformRegistry.ts` 或 `core/searchers.ts` | 平台 factory registry：组装 Searchers 字典并注入 HttpClient | ②③ |
| `core/httpPolicies.ts` 或 `utils/HttpClient.ts` | 平台 HTTP policy registry：声明限流、缓存、超时、重试、UA | ②③ |
| `core/tools.ts` | 生成平台型 `search_xxx` tools；工作流/维护工具保留显式定义 | ② 派生 + ① |
| `core/schemas.ts` | 生成普通平台搜索 schema；特殊工具保留能力域私有 schema | ② 派生 + ① |
| `core/handleToolCall.ts` | 平台搜索查表路由，简单搜索走 `handleGenericSearch`；工作流工具显式分发 | ② 派生 + ① |
| `core/capabilityProfile.ts` | 按 `capabilityGroups` 派生平台分组，结合能力域状态算能力画像 | ② 派生 + ① |
| `services/MultiSourceSearchService.ts` | 文献检索：多源并发 + 去重 | ① |
| `services/OpenAccessFallbackService.ts` | PDF 下载：回退漏斗（含下载策略注册表） | ① |
| `services/JournalMetricsService.ts` | 期刊检索：EasyScholar，独立隔离 | ① |
| 管理层（`config/` + `core/diagnostics` 等 + `skills/`） | 维护：配置/健康/Skill | ① |
| `utils/HttpClient.ts` | 真正的请求包装层：限流/缓存/重试/超时/错误/UA | ③ |
| `platforms/*.ts` | 数据源适配器，常规请求经 HttpClient 发出 | ②（消费③） |

> 注：物理上是否把 `services/` 按域拆进子目录是次要的；**关键是上面的依赖规则与重复事实源收敛**。死代码 `CitationService`（无任何调用方）应在目标态决定"注册成工具"或移除。

---

## 8. 现状 vs 目标 对比

| 维度 | 当前态 | 优化后目标态 |
|------|--------|-------------|
| 数据源登记处 | 7~8 个文件各一份 | 1 套数据源注册体系 |
| 加一个普通元数据搜索源要改 | 7~8 处 | **2 个逻辑位置**（新类 + 注册体系 1 条；特殊下载/正文/期刊源另接能力域） |
| 四个功能边界 | 混在 services/core | 4 个独立模块 + 明确依赖规则 |
| 横切能力（限流/缓存/错误） | 每平台手动、大面积不一致 | 统一 HttpClient，默认生效 |
| `tools.ts`/`schemas.ts`/`handleToolCall.ts` | 大量手写平台块（~400 行可删） | 生成器 + 派生，显著瘦身 |
| 对外命令 / JSON 输出 | — | **完全一致，不变** |

---

## 9. 目标态最终形态：加一个普通元数据搜索源

优化完成后，新增一个普通论文元数据搜索源只需两步：

**第一步**：在 `src/platforms/` 新建 `XxxSearcher.ts`，继承 `PaperSource`，用注入的 `HttpClient` 发请求。

**第二步**：在数据源注册体系里加一条描述和对应 factory / HTTP policy：

```ts
const descriptor = {
  id: 'xxx',
  displayName: 'Xxx',
  sourceKind: 'official-api',
  defaultInAll: true,
  directTool: true,
  toolName: 'search_xxx',
  supportedOptions: ['maxResults', 'year'],
  capabilityGroups: ['metadata_free'],
  supportsDoiLookup: true
};

const factory = (env, http) => new XxxSearcher(env.XXX_API_KEY, http);

const httpPolicy = {
  rateLimit: { rps: 1 },
  cache: { ttlMs: 3_600_000 }
};
```

完成后：平台型工具清单、普通搜索入参 schema、调用路由、能力画像、DOI 查找源、别名、以及限流/缓存/重试/错误等横切能力自动生效。这就是三轴收敛后要交付的核心体验。

如果新增的是 PDF 专用源、正文片段源、期刊指标源、机构权限源或维护命令，则还需要接入对应能力域的小注册表或显式工作流代码，不能强行塞进数据源注册表。

---

## 10. 优化必须守住的不变契约

优化只改"信息从哪来 / 请求怎么发"，不改"对外是什么"。以下契约在目标态必须与当前态完全一致：

- 工具名集合、每个工具的 `inputSchema` 结构 / `enum` 取值 / `required` 字段。
- 各平台 `maxResults` 上限与默认值、各搜索选项含义。
- 别名解析（`wos→webofscience`、`scholar→googlescholar`、`springerlink→springer` 等）。
- 能力画像 6 个条目（`metadata_search` / `citation_expansion` / `body_snippet_search` / `journal_metrics` / `pdf_discovery` / `entitled_access`）的状态判定结果。
- 所有命令的 JSON 输出格式。

实现期应至少用以下契约测试守住这些不变量：

- `paper-search tools` 的工具名和 `inputSchema` 快照。
- `doctor` / `status` 的 capability profile 快照。
- 平台别名解析快照（如 `wos`、`scholar`、`springerlink`）。
- `download_with_fallback` 的 attempts 顺序和字段结构。
