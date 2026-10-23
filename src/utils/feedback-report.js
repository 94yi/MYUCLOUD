// 用户反馈附带的诊断报告。报告在浏览器里生成，发出去之前就已脱敏，提交前原样展示给用户：
// - 不带作业标题、课程名、作业正文、提交内容、文件名、姓名、学号、令牌；
// - 作业 id 换成加盐哈希的短引用，同一份作业在不同报告里引用相同，但反推不出原 id；
// - 学校接口只带状态码类字段的值（status、assignmentStatus 等）和字段结构（字段名与类型）；
// - 调试日志只带事件名和时间，错误只带脱敏后的错误信息。
// 后端（server/routes/feedback.js）会再按通用模式脱敏一遍。

export const REPORT_SCHEMA = 1
const REF_SALT = 'myucloud-feedback-v1'
const MAX_ASSIGNMENTS = 120
const MAX_EVENTS = 40
const MAX_ERRORS = 10
const MAX_SHAPE_FIELDS = 120
const RECENT_DAYS = 30

// 学校接口里只是枚举或开关的字段：值本身不含个人信息，排查判断逻辑时需要原值
const STATUS_FIELDS = ['status', 'assignmentStatus', 'isOverTime', 'isOvertimeCommit', 'assignmentType', 'isOpenEvaluation']

const PATTERNS = [
  [/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '<令牌>'],
  [/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '<令牌>'],
  [/\b[A-Za-z0-9+/_-]{32,}={0,2}/g, '<令牌>'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<邮箱>'],
  [/\b\d{17}[\dXx]\b/g, '<证件号>'],
  [/(?<!\d)1[3-9]\d{9}(?!\d)/g, '<手机号>'],
  [/(?<!\d)\d{8,}(?!\d)/g, '<数字>'],
]

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 脱敏一段文字：先替换已知的个人信息（姓名、学号、令牌等），再按通用模式替换。 */
export function redactText(value, known = [], limit = 300) {
  let text = String(value ?? '')
  const secrets = [...new Set(known.map((item) => String(item ?? '').trim()).filter((item) => item.length >= 2))]
    .sort((left, right) => right.length - left.length)
  for (const secret of secrets) text = text.replace(new RegExp(escapeRegExp(secret), 'g'), '<个人信息>')
  for (const [pattern, replacement] of PATTERNS) text = text.replace(pattern, replacement)
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

/** 从登录用户信息里收集需要替换的值（所有字符串和较长的数字）。 */
export function collectKnownSecrets({ userInfo, username, token } = {}) {
  const known = [username, token]
  const visit = (node, depth) => {
    if (node === null || node === undefined || depth > 3) return
    if (typeof node === 'string') known.push(node)
    else if (typeof node === 'number' && String(node).length >= 4) known.push(String(node))
    else if (typeof node === 'object') for (const child of Object.values(node)) visit(child, depth + 1)
  }
  visit(userInfo, 0)
  return known.filter((item) => typeof item === 'string' && item.trim().length >= 2)
}

function typeOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/** 只描述字段结构：字段路径 → 类型，数组记长度，不带任何值。 */
export function describeShape(value) {
  const fields = {}
  let count = 0
  let truncated = false
  const visit = (node, path) => {
    const type = typeOf(node)
    if (path) {
      if (count >= MAX_SHAPE_FIELDS && !(path in fields)) {
        truncated = true
        return
      }
      if (!(path in fields)) count++
      const types = new Set(String(fields[path] || '').split('|').filter(Boolean))
      types.add(type === 'array' ? `array(${node.length})` : type)
      fields[path] = [...types].sort().join('|')
    }
    if (type === 'array') node.slice(0, 3).forEach((item) => visit(item, `${path}[]`))
    else if (type === 'object') for (const [name, child] of Object.entries(node)) visit(child, path ? `${path}.${name}` : name)
  }
  visit(value, '')
  return truncated ? { fields, truncated } : { fields }
}

function pickStatus(source) {
  if (!source || typeof source !== 'object') return {}
  return Object.fromEntries(
    STATUS_FIELDS.filter((name) => source[name] !== undefined).map((name) => [name, source[name]]),
  )
}

/** 作业 id → 8 位短引用（加盐 SHA-256）。 */
export async function assignmentRef(id) {
  if (id === null || id === undefined || id === '') return ''
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${REF_SALT}:${id}`))
  return [...new Uint8Array(digest)].slice(0, 4).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** 浏览器与系统：只取名称和主版本，不带完整 UA。 */
export function describeBrowser(userAgent = '') {
  const browsers = [
    ['Edge', /Edg\/(\d+)/], ['Opera', /OPR\/(\d+)/], ['Firefox', /Firefox\/(\d+)/],
    ['WeChat', /MicroMessenger\/(\d+)/], ['QQ', /QQ\/(\d+)/], ['Chrome', /Chrome\/(\d+)/], ['Safari', /Version\/(\d+).*Safari/],
  ]
  const systems = [
    ['iOS', /iPhone|iPad|iPod/], ['Android', /Android/], ['HarmonyOS', /HarmonyOS|OpenHarmony/],
    ['Windows', /Windows/], ['macOS', /Mac OS X/], ['Linux', /Linux/],
  ]
  const browser = browsers.find(([, pattern]) => pattern.test(userAgent))
  const system = systems.find(([, pattern]) => pattern.test(userAgent))
  return {
    browser: browser ? `${browser[0]} ${userAgent.match(browser[1])[1]}` : 'other',
    system: system ? system[0] : 'other',
    mobile: /Mobile|Android|iPhone/.test(userAgent),
  }
}

function countBy(items, key) {
  const counts = {}
  for (const item of items) counts[item[key]] = (counts[item[key]] || 0) + 1
  return counts
}

function isRelevant(assignment) {
  if (!assignment.isCompleted) return true
  return assignment.daysLeft !== null && assignment.daysLeft >= -RECENT_DAYS
}

function relativeView(view) {
  return ['study', 'timetable', 'course', 'assignment', 'debug', 'evaluation'].includes(view) ? view : 'other'
}

/**
 * 生成诊断报告。`assignments` 是 normalizeAssignment 之后的列表（raw 里是学校原始记录）；
 * `selected` / `detail` / `submitView` 是当前打开的作业；`logs` 是 App 的调试日志。
 */
export async function buildFeedbackReport({
  app = {},
  view = '',
  environment = {},
  session = {},
  courses = [],
  assignments = [],
  selected = null,
  detail = null,
  submitView = null,
  submitResult = null,
  logs = [],
  known = [],
} = {}) {
  const relevant = assignments.filter(isRelevant).slice(0, MAX_ASSIGNMENTS)
  const rows = await Promise.all(relevant.map(async (assignment) => ({
    ref: await assignmentRef(assignment.id),
    level: assignment.level,
    daysLeft: assignment.daysLeft,
    submitted: Boolean(assignment.isCompleted),
    hasSubmitTime: Boolean(assignment.submitTime),
    hasCourse: Boolean(assignment.courseId),
    ...pickStatus(assignment.raw),
  })))

  const report = {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    app: { commit: app.commit || '', mode: app.mode || '', backend: app.backend || 'same-origin' },
    environment: {
      ...describeBrowser(environment.userAgent || ''),
      language: environment.language || '',
      timezoneOffsetMinutes: environment.timezoneOffsetMinutes ?? null,
      viewport: environment.viewport || null,
    },
    view: relativeView(view),
    session: { ucloud: Boolean(session.ucloud), jwgl: Boolean(session.jwgl) },
    overview: {
      courses: courses.length,
      assignments: assignments.length,
      byLevel: countBy(assignments, 'level'),
      listed: rows.length,
    },
    assignments: rows,
  }

  if (selected) {
    report.selected = {
      ref: await assignmentRef(selected.id),
      level: selected.level,
      daysLeft: selected.daysLeft,
      submitted: Boolean(selected.isCompleted),
      list: pickStatus(selected.raw),
      detail: detail ? { ...pickStatus(detail), shape: describeShape(detail) } : null,
      submitView: submitView
        ? {
            ...pickStatus(submitView),
            attachments: Array.isArray(submitView.attachmentIds) ? submitView.attachmentIds.length : null,
            hasContent: Boolean(String(submitView.assignmentContent || '').replace(/<[^>]*>|&nbsp;/g, '').trim()),
            shape: describeShape(submitView),
          }
        : null,
      submitResult: submitResult && typeof submitResult === 'object'
        ? { confirmed: submitResult.confirmed ?? null, attachmentCount: submitResult.attachmentCount ?? null }
        : null,
    }
  }

  const ordered = [...logs].slice(0, 400)
  report.events = ordered.slice(0, MAX_EVENTS).map((item) => ({ time: item.time, event: redactText(item.label, known, 80) }))
  report.errors = ordered
    .filter((item) => /error/i.test(item.label) && item.data && typeof item.data === 'object')
    .slice(0, MAX_ERRORS)
    .map((item) => ({
      time: item.time,
      event: redactText(item.label, known, 80),
      message: redactText(item.data.message || item.data.name || '', known, 300),
    }))

  return report
}
