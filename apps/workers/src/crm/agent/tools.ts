export interface ToolDef {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const CRM_TOOLS: ToolDef[] = [
  {
    name: 'query_leads',
    description: '查询线索列表，支持搜索姓名/联系方式、按状态筛选、按下次联系时间筛选。返回匹配的线索列表及总数。',
    input_schema: {
      type: 'object',
      properties: {
        search:      { type: 'string', description: '搜索关键词（姓名、联系方式、来源、编号）' },
        status:      { type: 'string', description: '线索状态值，先用 get_options(lead_status) 获取可用值' },
        nextContact: { type: 'string', enum: ['overdue', 'today', 'week'], description: 'overdue=已逾期 today=今天到期 week=未来7天' },
        mine:        { type: 'boolean', description: '只查询分配给自己的线索' },
        pageSize:    { type: 'number', description: '返回条数，默认10，最多50' },
      },
    },
  },
  {
    name: 'get_lead',
    description: '获取单个线索的完整信息，包含基本资料和最近10条跟进记录。在对某条线索执行操作前先调用此工具了解现状。',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '线索ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'query_clients',
    description: '查询客户列表，支持搜索姓名/电话/邮箱、按合同状态筛选、按下次联系时间筛选。',
    input_schema: {
      type: 'object',
      properties: {
        search:         { type: 'string', description: '搜索关键词（姓名、电话、邮箱）' },
        contractStatus: { type: 'string', description: '合同状态值，先用 get_options(contract_status) 获取可用值' },
        nextContact:    { type: 'string', enum: ['overdue', 'today', 'week'], description: 'overdue=已逾期 today=今天到期 week=未来7天' },
        pageSize:       { type: 'number', description: '返回条数，默认10，最多50' },
      },
    },
  },
  {
    name: 'get_client',
    description: '获取单个客户的完整信息，包含基本资料和最近10条跟进记录。在对某个客户执行操作前先调用此工具了解现状。',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '客户ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_activity',
    description: '为线索或客户创建跟进记录。这是执行跟进、备注、安排下次联系的主要方式，所有动作都通过跟进记录留痕。',
    input_schema: {
      type: 'object',
      properties: {
        entityType:      { type: 'string', enum: ['lead', 'client'], description: '实体类型' },
        entityId:        { type: 'string', description: '线索或客户的ID' },
        activityType:    { type: 'string', description: '跟进类型值（如 Call、Meeting、Email、Note、System），先用 get_options(activity_type) 确认可用值' },
        description:     { type: 'string', description: '跟进内容描述' },
        nextContactDate: { type: 'string', description: '下次联系日期，格式 YYYY-MM-DD，可选' },
      },
      required: ['entityType', 'entityId', 'activityType', 'description'],
    },
  },
  {
    name: 'update_lead',
    description: '更新线索字段，包括状态、负责人、意向服务、备注、下次联系时间。重要：状态变更请同时用 create_activity 留下操作记录。',
    input_schema: {
      type: 'object',
      properties: {
        id:               { type: 'string', description: '线索ID' },
        status:           { type: 'string', description: '新状态值，先用 get_options(lead_status) 确认可用值' },
        assignedToUserId: { type: ['string', 'null'], description: '负责人用户ID，传 null 取消分配' },
        intendedServices: { type: 'array', items: { type: 'string' }, description: '意向服务名称列表' },
        notes:            { type: 'string', description: '备注内容' },
        nextContactDate:  { type: 'string', description: '下次联系日期 YYYY-MM-DD' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_client',
    description: '更新客户字段，包括合同状态、服务套餐、联系方式、下次联系时间。重要：重要变更请同时用 create_activity 留下操作记录。',
    input_schema: {
      type: 'object',
      properties: {
        id:             { type: 'string', description: '客户ID' },
        contractStatus: { type: 'string', description: '合同状态值，先用 get_options(contract_status) 确认可用值' },
        servicePlans:   { type: 'array', items: { type: 'string' }, description: '服务套餐名称列表' },
        phone:          { type: 'string', description: '联系电话' },
        email:          { type: 'string', description: '邮箱地址' },
        nextContactDate:{ type: 'string', description: '下次联系日期 YYYY-MM-DD' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_options',
    description: '获取系统中配置的枚举选项值。在执行状态变更等操作前必须先调用此工具确认有效值，避免传入无效值导致操作失败。',
    input_schema: {
      type: 'object',
      properties: {
        groupKey: {
          type: 'string',
          enum: ['lead_status', 'activity_type', 'contract_status', 'lost_reason'],
          description: '选项组：lead_status=线索状态 activity_type=跟进类型 contract_status=合同状态 lost_reason=丢失原因',
        },
      },
      required: ['groupKey'],
    },
  },
  {
    name: 'query_users',
    description: '查询系统用户列表，获取可分配的用户ID和姓名。在分配负责人前调用此工具确认用户ID。',
    input_schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['sales', 'operations', 'admin'], description: '按角色筛选，不传则返回全部活跃用户' },
      },
    },
  },
]
