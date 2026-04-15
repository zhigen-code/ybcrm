/** 将 D1 返回的 snake_case 字段名转为 camelCase，并自动解析 JSON 字符串字段 */
function keyToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

// 这些字段在 DB 里是 JSON 字符串，且期望返回数组，null/undefined 时默认 []
const JSON_ARRAY_FIELDS = new Set([
  'processSteps', 'serviceScope', 'specialization', 'intendedServices', 'servicePlans',
])

// 这些字段在 DB 里是 JSON 字符串，期望返回对象
const JSON_OBJECT_FIELDS = new Set(['detailedProfile', 'apiConfig'])

function parseValue(key: string, value: unknown): unknown {
  if (JSON_ARRAY_FIELDS.has(key)) {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? parsed : []
      } catch { return [] }
    }
    return Array.isArray(value) ? value : []
  }
  if (JSON_OBJECT_FIELDS.has(key)) {
    if (typeof value === 'string') {
      try { return JSON.parse(value) } catch { return null }
    }
    return value ?? null
  }
  return value
}

export function toCamel<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => {
      const camel = keyToCamel(k)
      return [camel, parseValue(camel, v)]
    }),
  ) as T
}

export function toCamelList<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => toCamel<T>(r))
}
