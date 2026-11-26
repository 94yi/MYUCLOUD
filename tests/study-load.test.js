import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import test from 'node:test'
import { loadStudySections } from '../src/utils/study-load.js'

function deferred() {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

test('课程和作业各自显示，互评和测验尚未完成时核心列表已就绪', async () => {
  const courses = deferred()
  const assignments = deferred()
  const activities = deferred()
  const reviews = deferred()
  const events = []
  const complete = loadStudySections({
    courses: async () => { const list = await courses.promise; events.push('courses shown'); return list },
    assignments: async () => { await assignments.promise; events.push('assignments shown') },
    activities: async () => { await activities.promise; events.push('activities shown') },
    reviews: async () => { await reviews.promise; events.push('reviews shown') },
    courseMap: async (list) => { assert.deepEqual(list, ['course']); return new Map([['id', 'course']]) },
    applyCourseMap: (map) => { assert.equal(map.get('id'), 'course'); events.push('map applied') },
  })
  courses.resolve(['course'])
  await setImmediate()
  assert.deepEqual(events, ['courses shown'])
  assignments.resolve()
  await setImmediate()
  assert.deepEqual(events, ['courses shown', 'assignments shown', 'map applied'])
  reviews.resolve()
  await setImmediate()
  assert.equal(events.at(-1), 'reviews shown')
  activities.resolve()
  assert.ok((await complete).every((result) => result.status === 'fulfilled'))
})

test('课程失败不阻止作业或基于作业的互评', async () => {
  const events = []
  await loadStudySections({
    courses: async () => { throw new Error('course error') },
    assignments: async () => { events.push('assignments') },
    activities: () => { events.push('unexpected activities') },
    courseMap: () => { events.push('unexpected map') },
    applyCourseMap: () => { events.push('unexpected enrichment') },
    reviews: () => { events.push('reviews') },
  })
  assert.deepEqual(events, ['assignments', 'reviews'])
})
