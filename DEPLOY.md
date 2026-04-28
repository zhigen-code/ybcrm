# 部署指南

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + Vite，部署到 Cloudflare Pages 或阿里云 ESA Pages |
| 后端 | Cloudflare Workers (Hono)，TypeScript |
| 数据库 | Cloudflare D1（SQLite） |
| 文件存储 | Cloudflare R2 |
| 任务队列 | Cloudflare Queues（线索分配、通知推送） |
| 邮件 | SendGrid |

---

## 环境变量 / Secrets

所有 Secret 通过 `wrangler secret put <KEY>` 写入，**不要**写入 `wrangler.toml`。

| 变量名 | 必填 | 说明 |
|---|---|---|
| `JWT_SECRET` | ✅ | CRM 内部员工 JWT 签名密钥，随机字符串即可 |
| `PORTAL_JWT_SECRET` | ✅ | 客户门户 JWT 签名密钥，与上方保持不同 |
| `SENDGRID_API_KEY` | 可选 | SendGrid API Key，不配置时邮件静默跳过 |
| `PORTAL_BASE_URL` | 可选 | 客户门户访问地址，用于生成 Magic Link，如 `https://portal.example.com` |

### 配置示例

```bash
wrangler secret put JWT_SECRET
wrangler secret put PORTAL_JWT_SECRET
wrangler secret put SENDGRID_API_KEY
wrangler secret put PORTAL_BASE_URL
```

---

## 邮件服务（SendGrid）

系统所有邮件均通过 `src/shared/email.ts` 统一发送，不存在分散的发件逻辑。

### 发件人地址

默认发件人为 `noreply@irfc.cn`，如需修改，编辑 `apps/workers/src/shared/email.ts` 顶部的常量：

```typescript
const FROM_EMAIL = 'noreply@irfc.cn'
const FROM_NAME  = '辅助生殖 CRM'
```

> ⚠️ SendGrid 要求发件人域名已完成 Domain Authentication，否则邮件会进入垃圾箱或被拒绝。请在 SendGrid 后台完成域名验证。

### 邮件触发场景

| 场景 | 收件人 | 相关文件 |
|---|---|---|
| 工作流 `send_email` 动作 | 配置中指定（支持模板变量） | `src/crm/workflow/executor.ts` |
| 个人提醒：新线索分配 | 被分配销售人员（个人设置中配置） | `src/notification/handler.ts` |
| 客户门户 Magic Link 登录 | 客户邮箱 | `src/portal/routes/auth.ts` |

### 未配置 SENDGRID_API_KEY 时的行为

`sendEmail()` 函数在 `env.SENDGRID_API_KEY` 为空时**静默跳过**，不会抛出错误。适合本地开发或不需要邮件功能的部署。

---

## 数据库迁移

```bash
# 应用所有未执行的迁移到远端
npx wrangler d1 migrations apply crm-db --remote

# 本地开发
npx wrangler d1 migrations apply crm-db
```

迁移文件位于 `apps/workers/migrations/`，命名规则为 `NNNN_描述.sql`。

---

## 前端部署

### Cloudflare Pages

```bash
pnpm --filter web build
# 部署 apps/web/dist 目录
```

环境变量（Pages 项目设置中配置）：

| 变量名 | 说明 |
|---|---|
| `VITE_API_BASE_URL` | Workers 接口地址，如 `https://crmapi.irfc.cn` |

`apps/web/public/_redirects` 已配置 SPA 路由回退：
```
/* /index.html 200
```

### 阿里云 ESA Pages

构建命令与 Cloudflare Pages 相同。CORS 跨域需在 ESA 边缘安全规则中额外配置：

1. **Rule 1**（OPTIONS 预检）：匹配 `request.method == "OPTIONS"`，动作：静态响应 204，Headers 写入 CORS 头
2. **Rule 2**（所有响应）：追加 `Access-Control-Allow-Origin` 等响应头

---

## Cloudflare Queues

系统使用两个队列，均需在 Cloudflare 控制台预先创建：

| 队列名 | 用途 |
|---|---|
| `lead-assignment-queue` | 新线索自动分配 |
| `notification-queue` | 分配后推送邮件 / Webhook 通知 |

创建命令：

```bash
npx wrangler queues create lead-assignment-queue
npx wrangler queues create notification-queue
```

---

## Workers 部署

```bash
cd apps/workers
npx wrangler deploy
```

---

## 本地开发

```bash
pnpm install

# 启动前端开发服务器
pnpm --filter web dev

# 启动 Workers 本地模拟（需先配置 .dev.vars）
cd apps/workers && npx wrangler dev
```

`.dev.vars` 示例（本地开发用，不提交）：

```
JWT_SECRET=dev-secret-change-in-production
PORTAL_JWT_SECRET=dev-portal-secret
SENDGRID_API_KEY=
PORTAL_BASE_URL=http://localhost:5173
```
