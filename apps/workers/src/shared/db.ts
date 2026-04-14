/** 将 D1 返回的 snake_case 字段名转为 camelCase，并自动解析 JSON 字符串字段 */
function keyToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

const JSON_FIELDS = new Set([
  'processSteps', 'serviceScope', 'detailedProfile', 'apiConfig', 'specialization',
])

function parseValue(key: string, value: unknown): unknown {
  if (typeof value === 'string' && JSON_FIELDS.has(key)) {
    try { return JSON.parse(value) } catch { return value }
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
