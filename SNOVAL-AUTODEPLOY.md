# Snoval 自动部署

[学习页](https://snoval.link/#study)的发布由 [Snoval production](https://github.com/94yi/MYUCLOUD/actions/workflows/snoval-production.yml) 负责。GitHub Actions 每半小时检查一次 [上游 master](https://github.com/AuceptinFang/MYUCLOUD/tree/master)。有变化时，把上游合入本仓库的 `snoval-production` 基线，运行测试，并构建学习页和 `/geport/`。测试或合并失败不会部署。正常发布后，流程核对线上版本、静态资源和后端代理响应；实际学校账号登录和提交需要手动验收。

## 首次启用

1. 在 [Cloudflare Account API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) 创建部署令牌：使用 **Edit Cloudflare Workers** 模板，把权限范围限制到 `snoval-study` 所属账号以及 `snoval.link` 区域。
2. 在 [GitHub 的 snoval-production 环境](https://github.com/94yi/MYUCLOUD/settings/environments)添加两个 **Environment secrets**：`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。
3. 在 [Actions → Variables](https://github.com/94yi/MYUCLOUD/settings/variables/actions) 设置仓库变量 `SNOVAL_AUTODEPLOY=true`。到 **Snoval production → Run workflow** 用 `master` 立即跑一次；不勾选 `dry_run` 才会发布。之后定时运行只发布有变化的版本。

## 维护和回滚

- 合并冲突：在 `snoval-production` 合入上游并解决冲突，再手动重跑。此基线保留 Worker 代理、同源接口和 Geport；工作流定义留在 fork 的默认分支 `master`。
- 线上有问题：先将 `SNOVAL_AUTODEPLOY` 设为 `false`，取消仍在运行的发布，再在 Cloudflare 的 **Workers & Pages → snoval-study → Deployments** 回滚到上一版本，避免定时任务把问题版本重新部署。修复后再启用变量。
- GitHub 公开仓库闲置 60 天可能暂停定时任务；可在 Actions 页面重新启用。仓库不需要保存或转发学校账号凭据。
