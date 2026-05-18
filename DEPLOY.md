# 部署指南

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + Vite，部署到 Cloudflare Pages |
| 后端 | Cloudflare Workers (Hono)，TypeScript |
| 数据库 | Cloudflare D1（SQLite） |
| 文件存储 | Cloudflare R2 |
| 任务队列 | Cloudflare Queues（线索分配、通知推送） |
| 邮件 | Resend / SendGrid（可选） |

---

## Fork 快速部署（推荐）

Fork 仓库后只需两步即可完成全自动部署：

### 第一步：设置 Cloudflare API Token

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加：

| 类型 | 名称 | 说明 |
|---|---|---|
| **Secret** | `CLOUDFLARE_API_TOKEN` | Cloudflare API Token，需包含 Workers、D1、R2、Queues、Pages 的编辑权限 |

> 在 Cloudflare 控制台 → My Profile → API Tokens → Create Token 创建，建议使用 "Edit Cloudflare Workers" 模板并额外添加 D1、R2、Pages、Queues 权限。

### 第二步：触发 Setup 工作流

在 GitHub Actions 页面手动触发 **Setup** 工作流。

工作流会自动完成：
- 从 `wrangler whoami` 获取 Account ID
- 以 `{owner首词}-{repo首词}-{branch}` 为前缀创建所有 Cloudflare 资源
- 生成随机 `JWT_SECRET` 和 `PORTAL_JWT_SECRET` 并写入 Worker Secrets
- 部署 Workers、执行数据库迁移、部署前端 Pages

完成后 Actions 日志末尾会输出访问地址。

### 后续更新

每次 push 到 `main` 分支会自动触发 **Deploy** 工作流，完成代码部署和数据库迁移。

---

## 自定义资源名称

Setup 工作流会根据仓库信息自动计算资源名称（如 `zhigen-crm-main`）。
如需自定义，在运行 Setup **之前**在 GitHub Variables 中预先设置以下任意项：

| Variable | 说明 | 默认值 |
|---|---|---|
| `WORKER_NAME` | Worker 名称 | `{owner}-{repo}-{branch}` |
| `D1_DATABASE_NAME` | D1 数据库名称 | `{prefix}-db` |
| `R2_BUCKET_NAME` | R2 存储桶名称 | `{prefix}-store` |
| `PAGES_PROJECT_NAME` | Pages 项目名称 | `{prefix}` |
| `LEAD_QUEUE_NAME` | 线索分配队列名称 | `{prefix}-leads` |
| `NOTIFY_QUEUE_NAME` | 通知队列名称 | `{prefix}-notify` |

---

## 可选配置（Setup 完成后）

通过 `wrangler secret put` 配置以下可选 Secrets：

| Secret | 说明 |
|---|---|
| `EMAIL_FROM` | 发件人邮箱（默认 `noreply@example.com`） |
| `EMAIL_FROM_NAME` | 发件人名称（默认 `CRM`） |
| `RESEND_API_KEY` | Resend API Key（优先使用） |
| `SENDGRID_API_KEY` | SendGrid API Key（回退选项） |
| `PORTAL_BASE_URL` | 客户门户访问地址，用于生成 Magic Link |

> 未配置邮件 Key 时，发邮件操作静默跳过，不影响其他功能。

---

## 自定义域名

在 Cloudflare 控制台手动绑定：
- **Worker 自定义域名**：Workers & Pages → 对应 Worker → Settings → Domains & Routes
- **Pages 自定义域名**：Workers & Pages → 对应 Pages → Custom domains

---

## 本地开发

```bash
pnpm install

# 启动前端开发服务器
pnpm --filter web dev

# 启动 Workers 本地模拟
cd apps/workers && npx wrangler dev
```

`apps/workers/.dev.vars` 示例（本地开发用，不提交）：

```
JWT_SECRET=dev-secret-change-in-production
PORTAL_JWT_SECRET=dev-portal-secret
EMAIL_FROM=dev@example.com
EMAIL_FROM_NAME=CRM Dev
RESEND_API_KEY=
PORTAL_BASE_URL=http://localhost:5173
```

本地 wrangler.toml 需要对应的环境变量，在 `.dev.vars` 同级创建 `.env` 文件或直接 export：

```bash
export CLOUDFLARE_ACCOUNT_ID=你的账户ID
export WORKER_NAME=crm-workers-dev
export D1_DATABASE_NAME=crm-db-dev
export D1_DATABASE_ID=你的D1数据库ID
export R2_BUCKET_NAME=crm-storage-dev
export LEAD_QUEUE_NAME=lead-assignment-queue-dev
export NOTIFY_QUEUE_NAME=notification-queue-dev
```

---

## 数据库迁移

迁移文件位于 `apps/workers/migrations/`，命名规则 `NNNN_描述.sql`。

```bash
# 手动应用到远端
cd apps/workers
npx wrangler d1 migrations apply "$D1_DATABASE_NAME" --remote
```
