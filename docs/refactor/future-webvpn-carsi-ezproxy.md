# Future - WebVPN / CARSI / EZProxy Institutional Access

状态：未来执行。只有 `02-download-tier-interface.md` 完成后才启动。

## 目标

在 `DownloadTier` 接口完成后，未来接入 WebVPN、CARSI、EZProxy、出版商机构登录和浏览器会话复用能力，用于访问用户所在机构已经订阅或授权的付费文献全文。

机构访问属于 PDF 下载层，只能通过 `institutional_access` tier 进入 `download_with_fallback`。

## 参考边界

参考对象：[Rimagination/scansci-pdf](https://github.com/Rimagination/scansci-pdf)。

参考其能力边界：

- WebVPN 学校配置和 URL transform。
- CARSI / OpenAthens / Shibboleth 出版商机构登录。
- EZProxy URL 模板。
- 可见浏览器登录和会话复用。
- status / providers / test 诊断命令。

本项目只借鉴接口形状和工作流，不复制 `scansci-pdf` 实现。

## 改动点

未来下载顺序：

```text
primary -> direct_pdf_url -> repositories -> unpaywall -> institutional_access -> scihub
```

`institutional_access` 是 composite tier，内部再分发到：

- `webvpn`
- `carsi`
- `ezproxy`
- `browser_session`

CLI 表面：

```bash
paper-search institutional status --pretty
paper-search institutional providers --pretty
paper-search institutional set-provider webvpn --pretty
paper-search institutional login --provider webvpn --pretty
paper-search institutional login --provider carsi --publisher sciencedirect --pretty
paper-search institutional test --doi 10.xxxx/xxxxx --pretty
```

下载仍通过 `download_with_fallback` 进入，并由 `useInstitutionalAccess` 或配置显式启用。

## 执行步骤

1. 在 `02` 预留的 `institutional_access` tier id 上接入配置开关，默认 false。
2. 增加 `paper-search institutional status/providers/test`，输出 provider、登录状态、可用入口和脱敏错误。
3. 实现 WebVPN provider：学校配置、入口 URL、目标 URL transform、浏览器 CAS 登录。
4. 实现 CARSI provider：publisher -> federated login route 映射、IdP 名称配置、浏览器登录。
5. 实现 EZProxy provider：URL 模板配置和目标 URL rewrite。
6. 实现 browser session provider：用户指定 browser profile，下载层复用登录态。

## 分阶段计划

Phase 0: 接口预留
- 依赖 `02-download-tier-interface.md`。
- 加入 disabled-by-default 的 `institutional_access` tier。

Phase 1: 本机状态与诊断
- 增加配置读取和脱敏输出。
- 支持检测 browser profile / cookie store 是否存在。

Phase 2: WebVPN Provider
- 支持学校配置、WebVPN 入口 URL、CAS 浏览器登录。
- 下载时把 publisher URL 通过 WebVPN URL transform 访问。

Phase 3: CARSI Provider
- 支持 publisher -> CARSI login route 映射。
- 支持用户配置 IdP 名称。

Phase 4: EZProxy / Browser Session Provider
- 支持 EZProxy URL 模板。
- 支持用户显式指定浏览器 profile。

## 凭证边界

- CLI 不接收账号、密码、验证码、cookie、token 参数。
- 登录由用户在本机可见浏览器完成。
- status/test 输出必须脱敏 URL、cookie、session、ticket、token。

## 非目标

- 不在当前 citation expansion 任务中实现机构登录。
- 不默认启用机构访问。
- 不保存或传输用户密码。
- 不做大规模并行抓取。
- 不把机构权限层纳入 `platformMetadata` 数据源注册表。

## 验收标准

- 机构权限层只能在显式启用且本机状态存在时参与下载。
- 未登录时返回清晰 `skipped` 或 `error`，并提示下一步。
- 所有状态和错误输出均脱敏。
- 未完成 provider 前，`download_with_fallback` 行为与当前版本一致。
