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
