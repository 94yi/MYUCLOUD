# Snoval 部署

主站：`https://snoval.link/`；报告封面：`https://snoval.link/geport/`。

```powershell
npm.cmd ci
npm.cmd ci --prefix geport
npm.cmd test
npm.cmd run build:snoval
npx.cmd wrangler login
npx.cmd wrangler deploy
```

构建会先生成 Vue 主站，再以 `/geport/` 为资源前缀构建 React 报告工具，合并至 `dist/geport/`。构建脚本将后端设为同源，报告工具入口设为 `/geport/`；调试入口与私有字体不进入该产物。Geport 使用本地编译的 Tailwind。

Cloudflare Worker 提供静态资源，并仅对 `/api`、`/ucloud`、`/file`、`/jwgl` 和 `/office` 转发到原项目现有后端 `https://myu.aucept.in`，因此登录和同步依赖该后端可用。浏览器使用本站同源路径；代理不缓存接口响应、不转发本站 Cookie，保留业务鉴权和流式文件响应。本次未迁移教务会话存储或独立部署后端。

Perrin 的 tokens 与间距控制器位于 `src/vendor/perrin/`，保留 MIT 许可证。上游将间距工具限定在开发环境；Snoval 生产构建遵循该行为。

上线检查：主站、`/geport` 重定向、`/geport/`、两套 JS/CSS 资源、`/api` 的 JSON 响应。需要真实学校账号的登录、上传和提交，应使用自己的账号进一步验收。

```powershell
node --use-env-proxy scripts/verify-live.js
```

## 回滚

先用 `npx.cmd wrangler deployments list` 查看版本，再运行 `npx.cmd wrangler rollback <版本ID>`。2026-11-04 更新之前的版本为 `90612e8b-9ea5-4a07-a2d2-08bdca7bde4a`。该发布不修改后端数据库；回滚 Worker 会恢复对应静态资源与代理代码。
