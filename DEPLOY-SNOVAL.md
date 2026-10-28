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

构建会先生成 Vue 主站，再以 `/geport/` 为资源前缀构建 React 报告工具，合并至 `dist/geport/`。Geport 保留原项目功能，Tailwind 本地编译，不再从 CDN 运行加载。`geport/` 是来自本机原项目的源码副本，原项目未修改。

Cloudflare Worker 提供静态资源，并仅对 `/api`、`/ucloud`、`/file`、`/jwgl` 和 `/office` 转发到原项目现有后端 `https://myu.aucept.in`，因此登录和同步依赖该后端可用。浏览器使用本站同源路径；代理不缓存接口响应、不转发本站 Cookie，保留业务鉴权和流式文件响应。本次未迁移教务会话存储或独立部署后端。

Perrin 的 tokens 与间距控制器位于 `src/vendor/perrin/`，保留 MIT 许可证。间距控制作用于当前工作台，支持预览、保存、取消和恢复默认；仅对桌面布局生效。

上线检查：主站、`/geport` 重定向、`/geport/`、两套 JS/CSS 资源、`/api` 的 JSON 响应。需要真实学校账号的登录、上传和提交，应使用自己的账号进一步验收。
