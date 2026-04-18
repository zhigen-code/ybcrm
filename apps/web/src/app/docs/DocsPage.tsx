import { useState } from 'react'

// ── 文档数据 ───────────────────────────────────────────────────────────────────

const TEMPLATE_VAR_GROUPS = [
  {
    label: '线索字段',
    entityType: 'lead' as const,
    vars: [
      { key: 'name',             desc: '线索姓名' },
      { key: 'contactInfo',      desc: '联系方式' },
      { key: 'source',           desc: '来源渠道' },
      { key: 'status',           desc: '当前状态' },
      { key: 'intendedServices', desc: '意向服务（多项时以顿号分隔）' },
      { key: 'lostReason',       desc: '丢失原因' },
      { key: 'nextContactDate',  desc: '下次联系时间' },
      { key: 'notes',            desc: '备注' },
      { key: 'assignedToName',   desc: '负责人姓名' },
      { key: 'assignedToEmail',  desc: '负责人邮箱' },
      { key: 'createdAt',        desc: '创建时间' },
    ],
  },
  {
    label: '客户字段',
    entityType: 'client' as const,
    vars: [
      { key: 'name',               desc: '客户姓名' },
      { key: 'phone',              desc: '电话' },
      { key: 'email',              desc: '邮箱' },
      { key: 'contractStatus',     desc: '合同状态' },
      { key: 'servicePlans',       desc: '服务套餐（多项时以顿号分隔）' },
      { key: 'assignedSalesName',  desc: '负责销售姓名' },
      { key: 'assignedSalesEmail', desc: '负责销售邮箱' },
      { key: 'createdAt',          desc: '创建时间' },
    ],
  },
  {
    label: '时间变量',
    entityType: null,
    vars: [
      { key: 'now',        desc: '当前时间（精确到分钟）',  example: '2026-04-18 14:30' },
      { key: 'today',      desc: '今天日期 YYYY-MM-DD',     example: '2026-04-18' },
      { key: 'tomorrow',   desc: '明天日期',                 example: '2026-04-19' },
      { key: 'yesterday',  desc: '昨天日期',                 example: '2026-04-17' },
      { key: 'weekStart',  desc: '本周一日期',               example: '2026-04-13' },
      { key: 'weekEnd',    desc: '本周日日期',               example: '2026-04-19' },
      { key: 'monthStart', desc: '本月第一天',               example: '2026-04-01' },
      { key: 'monthEnd',   desc: '本月最后一天',             example: '2026-04-30' },
    ],
  },
]

const ACTION_EXAMPLES = [
  {
    type: 'set_field',
    label: '自动赋值字段',
    icon: '✏️',
    desc: '满足触发条件时，自动将某个字段设置为指定值。字段值支持模板变量。',
    example: '触发：线索状态变为「已确认」\n字段：下次联系日期\n值：{{tomorrow}}',
    notes: [
      '赋值按动作列表顺序依次执行，前一个动作的结果可被后续动作的模板变量读取',
      '字段值中可以使用模板变量，如 {{today}}、{{name}} 等',
    ],
  },
  {
    type: 'send_email',
    label: '发送邮件',
    icon: '📧',
    desc: '触发时向指定邮箱发送通知邮件。收件人、主题、正文均支持模板变量。',
    example:
      '收件人：{{assignedToEmail}}\n主题：新线索提醒：{{name}}\n正文：你好，\n\n线索 {{name}}（{{contactInfo}}）已分配给你。\n来源：{{source}}\n意向服务：{{intendedServices}}\n\n请在 {{tomorrow}} 前完成首次跟进。',
    notes: [
      '邮件通过 SendGrid 发送，需在 Cloudflare Workers 环境变量中配置 SENDGRID_API_KEY',
      '收件人支持写死邮箱或使用 {{assignedToEmail}} / {{assignedSalesEmail}} 动态获取',
      '正文为纯文本格式，换行会被保留',
    ],
  },
  {
    type: 'webhook',
    label: 'Webhook 通知',
    icon: '🔗',
    desc: '触发时向外部系统发送 HTTP 请求，URL 和 Body 均支持模板变量。',
    example:
      'URL：https://hooks.example.com/crm\n方法：POST\nBody：{\n  "event": "lead_confirmed",\n  "name": "{{name}}",\n  "phone": "{{contactInfo}}",\n  "assignee": "{{assignedToName}}",\n  "date": "{{today}}"\n}',
    notes: [
      'Body 应为合法 JSON，字符串值中可嵌入 {{变量}}',
      '请求带 Content-Type: application/json 请求头',
      'GET 请求不发送 Body',
    ],
  },
  {
    type: 'require_activity',
    label: '要求跟进记录',
    icon: '📝',
    desc: '在前端拦截用户操作，要求先添加跟进记录才能完成状态变更。',
    example: '触发：线索状态变为「丢失」\n要求填写原因：是\n预设选项：客户无意向、价格不合适、已选其他机构',
    notes: ['仅在前端生效，后端 API 不做校验', '预设选项用英文逗号分隔'],
  },
  {
    type: 'require_fields',
    label: '强制填写字段',
    icon: '📋',
    desc: '要求用户在完成操作前必须填写指定字段，字段为空时无法继续。',
    example: '触发：线索状态变为「已确认」\n必填字段：下次联系日期、意向服务',
    notes: ['仅在前端生效，后端 API 不做校验'],
  },
]

const TIPS = [
  {
    title: '动作执行顺序',
    color: 'border-blue-200 bg-blue-50',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
    items: [
      '同一工作流内的动作按列表顺序串行执行',
      'set_field 执行后，新值立刻可被后续动作的模板变量读取',
      '一个动作失败不会阻止后续动作执行（每个动作独立 try-catch）',
    ],
  },
  {
    title: '邮件发送配置',
    color: 'border-green-200 bg-green-50',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
    items: [
      '发件服务使用 SendGrid，需在 Cloudflare Workers 环境变量中配置 SENDGRID_API_KEY',
      '未配置 SENDGRID_API_KEY 时，发送邮件动作静默跳过，不报错',
      '发件人固定为 noreply@irfc.cn（辅助生殖 CRM）',
    ],
  },
  {
    title: '变量未匹配时的行为',
    color: 'border-yellow-200 bg-yellow-50',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
    items: [
      '使用了不存在的变量名（如 {{xyz}}），系统会原样保留 {{xyz}}，不替换为空字符串',
      '这样便于排查配置错误，避免静默地发出含空白的错误通知',
      '字段值为 null 时，该变量不会出现在上下文中，引用它同样会原样保留',
    ],
  },
  {
    title: '触发时机与前端刷新',
    color: 'border-purple-200 bg-purple-50',
    titleColor: 'text-purple-800',
    textColor: 'text-purple-700',
    items: [
      '工作流在后台异步执行（fire-and-forget），前端操作不会等待工作流完成',
      'set_field 写入数据库后，前端页面需手动刷新才能看到最新值',
      '要求跟进（require_activity）和强制填写（require_fields）仅在前端拦截，后端 API 不校验',
    ],
  },
  {
    title: 'Webhook 安全',
    color: 'border-red-200 bg-red-50',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
    items: [
      'Webhook URL 支持模板变量，请确保 URL 来自可信来源，避免 SSRF 风险',
      '暂不支持请求签名或 HMAC 验证，接收端建议自行校验来源 IP 或添加 token 参数',
      'Body 中的变量插值发生在发送前，敏感数据（如密码）不应通过变量传递',
    ],
  },
]

// ── 文档目录结构 ───────────────────────────────────────────────────────────────

type SectionKey = 'intro' | 'vars' | 'actions' | 'tips'

const DOC_CATEGORIES = [
  {
    key: 'workflow',
    label: '工作流自动化',
    sections: [
      { key: 'intro'   as SectionKey, label: '概述' },
      { key: 'vars'    as SectionKey, label: '模板变量' },
      { key: 'actions' as SectionKey, label: '动作类型' },
      { key: 'tips'    as SectionKey, label: '注意事项' },
    ],
  },
]

// ── 各章节内容 ─────────────────────────────────────────────────────────────────

function SectionIntro() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">工作流自动化</h2>
      <p className="text-sm text-gray-500 mb-6">了解工作流的运行机制、触发方式与执行流程</p>

      <p className="text-sm text-gray-600 mb-6">
        工作流让系统在满足特定条件时自动执行一系列动作，减少手动操作、保证业务流程一致性。
        你可以在「系统管理 → 工作流」中配置和启用工作流。
      </p>

      <div className="rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">执行流程</p>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            {[
              { step: '1', title: '触发', desc: '新建实体，或字段变更为指定值', color: 'bg-blue-100 text-blue-700' },
              { step: '2', title: '匹配', desc: '查找所有启用的工作流，逐一比对触发条件', color: 'bg-yellow-100 text-yellow-700' },
              { step: '3', title: '执行', desc: '按动作列表顺序依次执行，前一动作结果可传递给后续动作', color: 'bg-green-100 text-green-700' },
            ].map(({ step, title, desc, color }, i, arr) => (
              <div key={step} className="flex-1 flex items-start gap-3">
                <div className="flex-1 text-center">
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold mb-2 ${color}`}>{step}</div>
                  <p className="text-sm font-semibold text-gray-800 mb-0.5">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex-none mt-4 text-gray-300 text-lg">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">触发类型</p>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            {
              trigger: '新建时',
              badge: 'on_create',
              desc: '实体（线索/客户）被创建时立即触发。适合发送欢迎通知、初始化字段默认值。',
            },
            {
              trigger: '字段变更',
              badge: 'field_change',
              desc: '指定字段变更为特定值时触发，如「状态 → 已确认」、「合同状态 → 已签署」。可为同一字段配置多个工作流，对应不同目标值。',
            },
          ].map(({ trigger, badge, desc }) => (
            <div key={trigger} className="flex gap-4 px-4 py-4">
              <div className="flex-none flex flex-col items-start gap-1">
                <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{trigger}</span>
                <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-500">{badge}</code>
              </div>
              <p className="text-sm text-gray-600 pt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">异步执行说明</p>
        <p className="text-sm text-amber-700">
          所有工作流动作在后台异步执行（fire-and-forget），不阻塞前端操作响应。
          <code className="mx-1 text-xs bg-amber-100 rounded px-1">set_field</code>
          类动作的数据库修改会实时写入，但前端页面需刷新后才能看到更新结果。
        </p>
      </div>
    </div>
  )
}

function SectionVars() {
  const [varEntity, setVarEntity] = useState<'lead' | 'client' | 'time'>('lead')

  const group = TEMPLATE_VAR_GROUPS.find((g) =>
    varEntity === 'time' ? g.entityType === null : g.entityType === varEntity,
  )!

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">模板变量</h2>
      <p className="text-sm text-gray-500 mb-6">在邮件、Webhook、自动赋值等文本中动态引用实体数据和时间</p>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">语法</p>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">基础用法</p>
            <code className="text-sm font-mono text-primary-700">{'你好，{{name}}'}</code>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">带命名空间（与上方等效）</p>
            <code className="text-sm font-mono text-primary-700">{'{{lead.name}}  /  {{client.name}}'}</code>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          未识别的变量名会<strong>原样保留</strong>（不替换为空），便于排查配置错误。
        </p>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {([['lead', '线索字段'], ['client', '客户字段'], ['time', '时间变量']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setVarEntity(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              varEntity === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 w-52">变量</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">说明</th>
              {varEntity === 'time' && (
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 w-40">示例值</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {group.vars.map((v) => (
              <tr key={v.key} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <code className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded px-1.5 py-0.5">
                    {`{{${v.key}}}`}
                  </code>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{v.desc}</td>
                {varEntity === 'time' && (
                  <td className="px-4 py-3">
                    <code className="text-xs text-gray-400">{'example' in v ? v.example : ''}</code>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        {varEntity === 'time' && (
          <p className="text-xs text-gray-500">
            时间变量基于系统设置中的时区计算（默认 Asia/Shanghai）。本周以周一为第一天，本月以自然月为准。
          </p>
        )}
        {varEntity === 'lead' && (
          <p className="text-xs text-gray-500">
            <code className="text-primary-700">assignedToName</code> / <code className="text-primary-700">assignedToEmail</code> 来自关联用户表，其余字段直接读取线索记录。
          </p>
        )}
        {varEntity === 'client' && (
          <p className="text-xs text-gray-500">
            <code className="text-primary-700">assignedSalesName</code> / <code className="text-primary-700">assignedSalesEmail</code> 来自关联用户表。
            <code className="text-primary-700 mx-1">servicePlans</code> 为数组，多项时以顿号（、）连接。
          </p>
        )}
      </div>
    </div>
  )
}

function SectionActions() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">动作类型</h2>
      <p className="text-sm text-gray-500 mb-6">工作流触发后可执行的五种动作及配置说明</p>

      <div className="space-y-5">
        {ACTION_EXAMPLES.map((item) => (
          <div key={item.type} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <span className="text-lg">{item.icon}</span>
              <span className="font-semibold text-gray-800">{item.label}</span>
              <code className="ml-auto text-xs bg-gray-200 text-gray-600 rounded px-2 py-0.5">{item.type}</code>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">{item.desc}</p>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">配置示例</p>
                <pre className="bg-gray-900 text-green-300 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {item.example}
                </pre>
              </div>
              {item.notes.length > 0 && (
                <div className="rounded-md bg-blue-50 border border-blue-100 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1.5">注意</p>
                  <ul className="space-y-1">
                    {item.notes.map((note, i) => (
                      <li key={i} className="text-xs text-blue-700 flex gap-2">
                        <span className="flex-none">·</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionTips() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">注意事项</h2>
      <p className="text-sm text-gray-500 mb-6">使用工作流时需要了解的边界行为与安全说明</p>

      <div className="space-y-4">
        {TIPS.map(({ title, color, titleColor, textColor, items }) => (
          <div key={title} className={`rounded-lg border p-4 ${color}`}>
            <p className={`text-sm font-semibold mb-2 ${titleColor}`}>{title}</p>
            <ul className="space-y-1.5">
              {items.map((item, i) => (
                <li key={i} className={`text-sm flex gap-2 ${textColor}`}>
                  <span className="flex-none mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 主页面 ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeCategory] = useState('workflow')
  const [activeSection, setActiveSection] = useState<SectionKey>('intro')

  const category = DOC_CATEGORIES.find((c) => c.key === activeCategory)!

  return (
    <div className="flex h-full">
      {/* 左侧文档导航 */}
      <aside className="hidden md:flex flex-col w-52 flex-shrink-0 border-r border-gray-200 bg-white py-6 px-3">
        {DOC_CATEGORIES.map((cat) => (
          <div key={cat.key} className="mb-4">
            <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {cat.label}
            </p>
            <div className="space-y-0.5">
              {cat.sections.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSection === key
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      {/* 移动端顶部章节切换 */}
      <div className="md:hidden fixed top-14 left-0 right-0 z-20 bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="flex gap-1">
          {category.sections.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex-none px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeSection === key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 mt-10 md:mt-0">
          {activeSection === 'intro'   && <SectionIntro />}
          {activeSection === 'vars'    && <SectionVars />}
          {activeSection === 'actions' && <SectionActions />}
          {activeSection === 'tips'    && <SectionTips />}
        </div>
      </main>
    </div>
  )
}
