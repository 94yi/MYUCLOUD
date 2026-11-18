import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

test('界面文案不使用点号分隔，保留隐私遮罩', () => {
  const files = readdirSync(new URL('../src/', import.meta.url), { recursive: true })
    .filter((name) => name.endsWith('.vue'))
  for (const file of files) {
    assert.doesNotMatch(readFileSync(new URL(`../src/${file.replaceAll('\\', '/')}`, import.meta.url), 'utf8'), /·|&middot;|\\u00b7/i, file)
  }
  assert.match(readFileSync(new URL('../src/components/common/DebugPanel.vue', import.meta.url), 'utf8'), /••••/)
  assert.doesNotMatch(readFileSync(new URL('../geport/index.html', import.meta.url), 'utf8'), /·/)
})

test('去除分隔点后，课程名、章节和附件元信息仍完整显示', async (t) => {
  const server = await createServer({ mode: 'pages', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  t.after(() => server.close())
  const cases = [
    ['CourseResourcePanel', {
      course: { siteName: '计算机系统基础' },
      resources: [{ id: 'chapter-1', name: '第一章', resourceTypeName: '课件', recommendLearnTime: 30, attachments: [{ id: 'file-1', name: '课件.pdf', ext: 'pdf', fileSizeUnit: '1.5 MB' }] }],
    }, ['按课程结构浏览', '计算机系统基础', '第一章', '课件.pdf', 'pdf', '1.5 MB', '建议 30']],
    ['CourseGrid', { courses: [{ id: 'course-1', siteName: '计算机系统基础', primaryTeachers: '示例教师', termName: '2026秋季' }] }, ['计算机系统基础', '示例教师', '2026秋季']],
    ['DeadlineList', { assignments: [{ id: 'assignment-1', title: '第一次作业', courseName: '计算机系统基础', chapter: '第一章', level: 'pending', deadline: '2026-11-30 23:59', status: '未提交' }] }, ['第一次作业', '计算机系统基础', '第一章', '2026-11-30 23:59']],
  ]
  for (const [name, props, expected] of cases) {
    const { default: Component } = await server.ssrLoadModule(`/src/components/common/${name}.vue`)
    const html = await renderToString(createSSRApp(Component, props))
    assert.doesNotMatch(html, /·/)
    for (const text of expected) assert.ok(html.includes(text), `${name}: ${text}`)
  }
})

test('测验保留站内入口、得分、选中与读取状态，不恢复分隔点', async (t) => {
  const server = await createServer({ mode: 'snoval', logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null } })
  t.after(() => server.close())
  const { default: DeadlineList } = await server.ssrLoadModule('/src/components/common/DeadlineList.vue')
  const html = await renderToString(createSSRApp(DeadlineList, {
    assignments: [{ id: 'quiz-1', kind: 'quiz', kindLabel: '测验', title: '章节测验', courseName: '计算机系统基础', chapter: '第一章', scoreText: '得分 95', isCompleted: true, level: 'submitted', status: '已提交', deadline: '2026-11-30 23:59' }],
    selectedAssignmentId: 'quiz-1',
    loadingAssignmentId: 'quiz-1',
    pageSize: 35,
  }))
  assert.match(html, /<button[^>]*class="selected feed-assignment"[^>]*disabled[^>]*type="button"/)
  assert.match(html, /<select value="35">/)
  assert.match(html, /<option value="35">35 项<\/option>/)
  for (const text of ['章节测验', '计算机系统基础', '第一章', '得分 95', '读取中…']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /·|去 UCloud 作答|href=/)
})
