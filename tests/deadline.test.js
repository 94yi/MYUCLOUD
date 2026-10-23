import assert from 'node:assert/strict'
import test from 'node:test'
import { allowsLateSubmission, isRecordCompleted, normalizeAssignment, sortAssignments } from '../src/utils/deadline.js'

// 字段组合取自真实账号的作业列表：status 2 进行中 / 3 已截止，assignmentStatus 99 未提交 / 0 已提交 / 1 已批改，
// isOverTime 1 表示截止后补交。
const daysFromNow = (days) => {
  const date = new Date(Date.now() + days * 86400000)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const record = (fields) => ({
  id: fields.id ?? '1',
  assignmentTitle: fields.title ?? '作业',
  assignmentEndTime: fields.end,
  submitTime: fields.submitTime ?? null,
  status: fields.status,
  assignmentStatus: fields.assignmentStatus,
  isOverTime: fields.isOverTime ?? 0,
  siteId: fields.siteId,
})

test('已截止（status 3）但 assignmentStatus 99 的作业不算已提交', () => {
  const missed = record({ end: daysFromNow(-2), status: 3, assignmentStatus: 99, siteId: 'c1' })
  assert.equal(isRecordCompleted(missed), false)
  const assignment = normalizeAssignment(missed)
  assert.equal(assignment.level, 'overdue')
  assert.equal(assignment.isOverdue, true)
  assert.equal(assignment.status, '已截止未交')
})

test('assignmentStatus 0 / 1 或有提交时间都算已提交，与 status 无关', () => {
  assert.equal(isRecordCompleted(record({ end: daysFromNow(3), status: 2, assignmentStatus: 0 })), true)
  assert.equal(isRecordCompleted(record({ end: daysFromNow(-30), status: 3, assignmentStatus: 1, submitTime: '2026-06-24 20:13' })), true)
  assert.equal(isRecordCompleted(record({ end: daysFromNow(3), status: 2, assignmentStatus: 99 })), false)
  assert.equal(normalizeAssignment(record({ end: daysFromNow(-90), status: 3, assignmentStatus: 1, submitTime: 'x', isOverTime: 1 })).isLateSubmission, true)
})

test('没有归到本学期课程且截止很久的未交作业算往期未交，不进已逾期', () => {
  const old = normalizeAssignment(record({ end: daysFromNow(-400), status: 3, assignmentStatus: 99 }))
  assert.equal(old.level, 'missed')
  assert.equal(old.status, '往期未交')
  // 刚截止的即使没对上课程也仍算逾期
  assert.equal(normalizeAssignment(record({ end: daysFromNow(-2), status: 3, assignmentStatus: 99 })).level, 'overdue')
  // 本学期课程里的老作业仍算逾期
  assert.equal(normalizeAssignment(record({ end: daysFromNow(-400), status: 3, assignmentStatus: 99, siteId: 'c1' })).level, 'overdue')
})

test('截止未交按刚过截止的在前排序，往期未交排在已提交之后', () => {
  const sorted = sortAssignments([
    normalizeAssignment(record({ id: 'old', end: daysFromNow(-400), status: 3, assignmentStatus: 99 })),
    normalizeAssignment(record({ id: 'long', end: daysFromNow(-20), status: 3, assignmentStatus: 99, siteId: 'c' })),
    normalizeAssignment(record({ id: 'done', end: daysFromNow(-5), status: 3, assignmentStatus: 0, submitTime: 'x' })),
    normalizeAssignment(record({ id: 'recent', end: daysFromNow(-1), status: 3, assignmentStatus: 99, siteId: 'c' })),
    normalizeAssignment(record({ id: 'soon', end: daysFromNow(2), status: 2, assignmentStatus: 99, siteId: 'c' })),
  ])
  assert.deepEqual(sorted.map((item) => item.id), ['recent', 'long', 'soon', 'done', 'old'])
})

test('isOvertimeCommit 决定能否补交，缺失时未知', () => {
  assert.equal(allowsLateSubmission({ data: { isOvertimeCommit: 0 } }), false)
  assert.equal(allowsLateSubmission({ isOvertimeCommit: 1 }), true)
  assert.equal(allowsLateSubmission({ data: {} }), null)
  assert.equal(allowsLateSubmission(null), null)
})
