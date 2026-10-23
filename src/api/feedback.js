import { fetchBackend, readBackendPayload, responseErrorMessage } from './http.js'

export const FEEDBACK_CATEGORIES = [
  { value: 'display', label: '作业或课程显示不对' },
  { value: 'submit', label: '提交作业失败' },
  { value: 'login', label: '登录问题' },
  { value: 'timetable', label: '课表或评教' },
  { value: 'suggestion', label: '功能建议' },
  { value: 'other', label: '其他' },
]

/** 提交一条反馈（POST /api/feedback）；返回反馈编号。 */
export async function submitFeedback({ category, message, contact, report }) {
  const response = await fetchBackend('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, message, contact, report }),
  })
  const { body } = await readBackendPayload(response, { allowText: true })
  if (!response.ok || !body?.success) {
    throw new Error(body?.msg || responseErrorMessage(response, body, '提交反馈'))
  }
  return body.id
}
