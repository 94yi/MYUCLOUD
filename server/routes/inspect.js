// 只记录学校接口的字段结构（字段名、类型、数组长度）和 code/success/msg，不记录字段内容。
export const INSPECTED_PATHS = [
  '/ykt-site/work/student/list',
  '/ykt-site/work/detail',
  '/ykt-site/work/submit-view',
  '/ykt-site/work/submit',
  '/ykt-site/site/student/undone',
  '/blade-source/resource/upload/biz',
  '/blade-source/resource/list/byId',
]

const MAX_FIELDS = 400

function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export function describeShape(value) {
  const fields = new Map()
  const arrays = new Map()
  const visit = (node, path) => {
    const type = typeOf(node)
    if (path) {
      if (!fields.has(path)) fields.set(path, new Set())
      fields.get(path).add(type)
    }
    if (type === 'array') {
      const key = path || '$'
      const lengths = arrays.get(key) || []
      lengths.push(node.length)
      arrays.set(key, lengths)
      for (const item of node) visit(item, `${path}[]`)
    } else if (type === 'object') {
      for (const [name, child] of Object.entries(node)) visit(child, path ? `${path}.${name}` : name)
    }
  }
  visit(value, '')
  const entries = [...fields].slice(0, MAX_FIELDS).map(([path, types]) => [path, [...types].sort().join('|')])
  return {
    fields: Object.fromEntries(entries),
    truncated: fields.size > MAX_FIELDS,
    arrays: Object.fromEntries([...arrays].map(([path, lengths]) => [
      path,
      lengths.length === 1 ? lengths[0] : { count: lengths.length, min: Math.min(...lengths), max: Math.max(...lengths) },
    ])),
  }
}

function envelope(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {}
  const { code, success, msg } = body
  return { code, success, msg: typeof msg === 'string' ? msg.slice(0, 200) : msg }
}

export function shouldInspect(upstreamPath) {
  return INSPECTED_PATHS.includes(upstreamPath)
}

async function readJsonShape(message) {
  const type = message.headers.get('content-type') || ''
  if (!type.includes('json')) return { contentType: type.split(';')[0] || null }
  const text = await message.text()
  try {
    const body = JSON.parse(text)
    return { ...envelope(body), shape: describeShape(body) }
  } catch {
    return { contentType: type.split(';')[0], invalidJson: true, bytes: text.length }
  }
}

export async function logUpstreamShape({ method, upstreamPath, request, response, started }) {
  try {
    const entry = { event: 'ucloud_shape', method, path: upstreamPath, status: response.status, ms: Date.now() - started }
    if (request) entry.request = await readJsonShape(request)
    entry.response = await readJsonShape(response)
    console.log(JSON.stringify(entry))
  } catch (error) {
    console.error(JSON.stringify({ event: 'ucloud_shape_failure', path: upstreamPath, message: error.message }))
  }
}
