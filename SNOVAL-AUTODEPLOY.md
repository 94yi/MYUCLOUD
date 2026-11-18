# Snoval 自动部署

[学习页](https://snoval.link/#study)的发布由 [Snoval production](https://github.com/94yi/MYUCLOUD/actions/workflows/snoval-production.yml) 负责。GitHub Actions 每半小时检查一次 [上游 master](https://github.com/AuceptinFang/MYUCLOUD/tree/master)。有变化时，把上游合入本仓库的 `snoval-production` 基线，运行测试，并构建学习页和 `/geport/`。测试或合并失败不会部署。正常发布后，流程核对线上版本、静态资源和后端代理响应；实际学校账号登录和提交需要手动验收。

## 首次启用

1. 在 [Cloudflare Account API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) 创建部署令牌：范围选 **Specified Workers**，仅选择 `snoval-study`，角色为 **Editor**。不授予 DNS、域名路由修改或其他 Worker 权限。
2. 在 [GitHub 的 snoval-production 环境](https://github.com/94yi/MYUCLOUD/settings/environments)添加两个 **Environment secrets**：`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。
3. 先在 **Snoval production → Run workflow** 选择 `master` 并勾选 `dry_run`。流程会合并上游、测试和构建，并用环境凭据只读确认令牌有效且可访问现有 Worker；不上传 Worker 版本、不发布。只读检查不能证明写入权限。
4. 上一步通过后，在 [Actions → Variables](https://github.com/94yi/MYUCLOUD/settings/variables/actions) 设置仓库变量 `SNOVAL_AUTODEPLOY=true`。再用 `master` 手动运行一次，不勾选 `dry_run`，确认首次实际发布和线上验证成功。之后定时运行只发布有变化的版本。

发布使用 `wrangler versions upload` 和 `wrangler versions deploy`，保留现有远端变量，不同步 routes、Custom Domains 或 Cron Triggers。`snoval.link` 的既有绑定由 Cloudflare 管理，工作流不修改它。如果令牌权限验证或发布失败，不扩大令牌权限；先确认报错请求和作用范围。首次发布失败时关闭 `SNOVAL_AUTODEPLOY`，处理后重新验证。

## 维护和回滚

- 合并冲突：在 `snoval-production` 合入上游并解决冲突，再手动重跑。此基线保留 Worker 代理、同源接口和 Geport；工作流定义留在 fork 的默认分支 `master`。
- 线上有问题：先将 `SNOVAL_AUTODEPLOY` 设为 `false`，取消仍在运行的发布，再在 Cloudflare 的 **Workers & Pages → snoval-study → Deployments** 回滚到上一版本，避免定时任务把问题版本重新部署。修复后再启用变量。
- GitHub 公开仓库闲置 60 天可能暂停定时任务；可在 Actions 页面重新启用。仓库不需要保存或转发学校账号凭据。
