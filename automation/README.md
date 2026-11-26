# 独立运行测验与互评服务

两个开关默认关闭。启用任一项后，第一次完整读取学校列表只建立基线；此后发现的新任务才进入自动处理。不要用部署示例覆盖现有状态目录，也不要运行第二个指向同一账号的实例。

- **测验**：开放后进入试卷、用 GPT 解题并保存，在本次作答截止前约 20 秒交卷。学校允许重做且成绩未满时，根据评分反馈纠错；不会原样重复同一方案。无法确定新方案时停下，等待人工核对。
- **互评**：提交前重新读取名单、核对对方的提交时间、互评开放期、学校的进入权限和已有评分。只对未评记录写入配置的星数和评语，写后回读。学校写入结果不确定时不自动重发。
- **登录**：每 5 分钟检查，无需等到有待办。同一次续期故障只入队一次私聊提醒。提醒适配器需要已有 Companion 私聊队列；没有配置时只记录通知未入队，不影响学校登录检查。

## 安装（Linux 用户服务）

使用 Node.js 22。示例假定仓库位于 `~/MYUCLOUD`；若不同，先调整服务文件的 ExecStart。服务从当前工作目录读取设置、保存状态；示例使用 `~/.local/state/snoval-automation`。学校登录按 CLI 的方式写入默认会话目录，或对 CLI 和服务配置相同的 MYU_HOME。

1. 建立仅本人可访问的状态目录，复制 `settings.example.json` 为其中的 `settings.json`。只启用你授权的项目。自动测验会把题目发送给 OpenAI 并消耗 API 额度；在私有环境文件 `~/.config/snoval-automation/env` 设置 OPENAI_API_KEY 后再开启。
2. 如需 QQ 私聊提醒，在同一环境文件设置 SNOVAL_QQ_PYTHON（安装了 Companion 的 Python）、SNOVAL_OWNER_CONFIG（绑定私聊所有者的配置）、SNOVAL_AUTHORITY_DB（由现有 QQ 队列消费的数据库）。若 Companion 从源码运行，另设 SNOVAL_COMPANION_SRC。环境文件权限设为 0600。
3. 运行 `systemctl --user enable --now "$PWD/automation/snoval-automation.service"`。服务由用户管理器启动；无人登录时仍需运行的主机，应配置用户管理器随系统启动。
4. 用 `journalctl --user -u snoval-automation.service` 查看状态。从状态目录运行 `python3 ~/MYUCLOUD/automation/login.py --renew` 可通过隐藏提示补充续期凭据：需已有测验基线以核对账号，确认续期成功才替换会话并重新加载服务。首次登录可运行同一脚本，不加 --renew。

运行 `node automation/simulation.mjs` 和 `node automation/simulate-repeat.mjs` 验证模拟流程，不会触碰真实作业或测验。
