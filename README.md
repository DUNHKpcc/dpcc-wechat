# 个人用量工具

原生微信小程序个人工具，用于查看账户余额、订阅、Token 用量、年度活动热力图、常用模型、可用模型和 API 密钥。

## 本地运行

1. 使用微信开发者工具导入本目录。
2. `project.config.json` 已配置正式小程序 AppID。
3. `src/config/runtime.ts` 使用 `https://api.dpccgaming.xyz` 读取公开数据、业务数据和微信登录 BFF。
4. 在微信公众平台把 `https://api.dpccgaming.xyz` 配置为 request 合法域名。

账户余额、累计用量、订阅、统计、可用模型、用户资料和密钥均请求云端真实数据。小程序不包含固定用户 ID、手工 Access Token 登录或模拟私有数据。

Token 活动通过 `/api/data/self` 按 30 天窗口并行读取最近 371 天数据，以兼容接口单次查询最多 30 天的限制。

模型列表根据 `/api/pricing` 的模型及厂商 icon key 显示本地图标，资源来自项目现有的 `@lobehub/icons`（MIT），许可证保留在 `src/assets/model-icons/LICENSE.lobe-icons`。

## 上线前校验

```bash
bun install
bun run release:check
```

还必须完成以下服务端与微信公众平台配置：

1. 在 `https://api.dpccgaming.xyz` 部署 `/mini/v1/auth/login`、`/mini/v1/auth/resume` 和 `/mini/v1/auth/logout`。
2. 配置 BFF 的小程序 AppID、AppSecret、Mini Session 存储和 new-api Refresh Cookie 加密存储。
3. 在 new-api 开启微信登录并配置 `WeChatServerAddress` 与 `WeChatServerToken`。
4. 确认 BFF 返回的 canonical WeChat ID 与已有 `users.wechat_id` 使用同一身份口径。
5. 在微信公众平台完成备案、服务器域名、业务域名、隐私保护指引和服务类目配置。

## 接口边界

小程序只持久化 BFF 签发的可撤销 Mini Session。new-api Access Token 只保存在运行内存，不保存 Refresh Cookie、管理 PAT 或完整 API Key。

具体接入约定见主项目中的：

- `../new-api/docs/wechat-mini-program-design.md`
- `../new-api/docs/wechat-mini-program-legacy-zero-change-integration.md`
