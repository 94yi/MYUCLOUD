import assert from 'node:assert/strict'
import test from 'node:test'
import { isSubmitViewSubmitted } from '../src/utils/deadline.js'

test('未提交作业的 submit-view 只带 assignmentId 时不算已提交', () => {
  assert.equal(isSubmitViewSubmitted({ code: 200, data: { assignmentId: '2105182229130760193' } }), false)
  assert.equal(isSubmitViewSubmitted({ data: { assignmentId: '1', assignmentContent: '<p>&nbsp;</p>', attachmentIds: [] } }), false)
  assert.equal(isSubmitViewSubmitted({ data: { assignmentId: '1', submitTime: null, assignmentContent: null } }), false)
  assert.equal(isSubmitViewSubmitted({ data: null }), false)
})

test('出现提交内容、附件、提交时间或已提交状态时算已提交', () => {
  assert.equal(isSubmitViewSubmitted({ data: { assignmentId: '1', assignmentContent: '<p>答案</p>' } }), true)
  assert.equal(isSubmitViewSubmitted({ data: { assignmentId: '1', attachmentIds: ['2111423967090982914'] } }), true)
  assert.equal(isSubmitViewSubmitted({ data: { assignmentId: '1', submitTime: '2026-10-17 19:47:56' } }), true)
  assert.equal(isSubmitViewSubmitted({ data: { assignmentId: '1', assignmentStatus: 0 } }), true)
})

test('截止后的 submit-view：status 3 只表示作业已截止，assignmentStatus 99 仍是未提交', () => {
  // 真实的未提交响应：assignmentId 为 -1，status 3，assignmentStatus 99
  const unsubmitted = { code: 200, data: { attachmentIds: [], assignmentId: -1, assignmentContent: '', status: 3, isOvertimeCommit: 0, assignmentStatus: 99 } }
  assert.equal(isSubmitViewSubmitted(unsubmitted), false)
  const submitted = { code: 200, data: { attachmentIds: ['2112081003577806850'], assignmentId: '2109667052121608193', status: 3, isOvertimeCommit: 1, assignmentStatus: 0 } }
  assert.equal(isSubmitViewSubmitted(submitted), true)
})
