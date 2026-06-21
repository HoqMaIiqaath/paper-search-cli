# paper-search-cli Refactor Execution Index

本目录是 `ARCHITECTURE_REFACTOR.zh.md` 的执行入口。总架构只保留边界；这里的每个 Markdown 都是一份可直接执行的功能任务书。

## 当前状态

| 文档 | 状态 | 执行结论 |
| --- | --- | --- |
| [01-citation-tools.md](./01-citation-tools.md) | 可执行 | 接入现有 `CitationService`，新增施引文献和参考文献工具。 |
| [02-download-tier-interface.md](./02-download-tier-interface.md) | 可执行 | 重排 PDF fallback 为 `DownloadTier`，保持现有下载行为。 |
| [03-skill-cli-contract-update.md](./03-skill-cli-contract-update.md) | 可执行 | 同步 CLI、Skill、README 契约。 |
| [04-citation-tests-and-acceptance.md](./04-citation-tests-and-acceptance.md) | 可执行 | 为 01 到 03 补测试并跑最终验收。 |
| [future-webvpn-carsi-ezproxy.md](./future-webvpn-carsi-ezproxy.md) | 未来执行 | 等 `DownloadTier` 完成后接入机构访问。 |

## 当前执行顺序

1. 执行 [01-citation-tools.md](./01-citation-tools.md)。
2. 执行 [02-download-tier-interface.md](./02-download-tier-interface.md)。
3. 执行 [03-skill-cli-contract-update.md](./03-skill-cli-contract-update.md)。
4. 执行 [04-citation-tests-and-acceptance.md](./04-citation-tests-and-acceptance.md)。

`01` 和 `02` 可并行开发；`03` 依赖 `01` 的工具名和 schema；`04` 在 `01` 到 `03` 完成后执行。

## 未来执行

WebVPN / CARSI / EZProxy 接入只走 [future-webvpn-carsi-ezproxy.md](./future-webvpn-carsi-ezproxy.md)。该任务依赖 `02`，不得跳过 `DownloadTier` 直接写机构登录逻辑。

## 文档关系

- 当前现状：[../ARCHITECTURE.zh.md](../ARCHITECTURE.zh.md)
- 目标总架构：[../ARCHITECTURE_REFACTOR.zh.md](../ARCHITECTURE_REFACTOR.zh.md)
- 当前执行：本目录 `01` 到 `04`
- 未来执行：本目录 `future-webvpn-carsi-ezproxy.md`

## 非目标

- 不在索引里重复实现细节。
- 不把未来机构访问写成当前能力。

## 验收标准

- `01` 到 `04` 均包含目标、改动点、执行步骤、非目标、验收标准。
- `future-webvpn-carsi-ezproxy.md` 明确依赖 `DownloadTier`。
- `../ARCHITECTURE_REFACTOR.zh.md` 只指向本索引和本目录文档。
