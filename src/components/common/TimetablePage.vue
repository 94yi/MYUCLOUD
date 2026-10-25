<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import JwglAuthBar from './JwglAuthBar.vue'
import { jwglLoggedIn, jwglRequest, jwglSessionId, jwglUsername } from '../../api/jwgl.js'
import {
  TIMETABLE_KEY, currentTimetableWeek, groupTimetableCourses, mergeTimetableWeek, readTimetableCache,
  readTimetableNotes, writeTimetableNote,
} from '../../utils/timetable.js'

const error = ref('')
const storageWarning = ref('')
const cache = ref(null)
try {
  cache.value = readTimetableCache(localStorage)
} catch {
  storageWarning.value = '无法读取本地课表，请重新同步。'
}

const busy = ref(false)
const progress = ref('')
const selectedWeek = ref(currentTimetableWeek(cache.value?.weeks || []) ?? cache.value?.weeks[0]?.week ?? 0)
const mode = ref(cache.value?.mode || '')
const modes = computed(() => cache.value?.weeks[0]?.modes || [])
const weeks = computed(() => cache.value?.weeks || [])
const current = computed(() => weeks.value.find((week) => week.week === selectedWeek.value))
const groups = computed(() => Array.from({ length: 7 }, (_, index) => groupTimetableCourses(current.value?.courses || [], index + 1)))
const savedAt = computed(() => cache.value ? new Date(cache.value.savedAt).toLocaleString('zh-CN', { hour12: false }) : '')
const missingWeeks = computed(() => (current.value?.weeks || []).filter((week) => !weeks.value.some((saved) => saved.week === week)))
const notes = ref({})
const editingNote = ref(null)
watch(() => cache.value?.username, (username) => {
  editingNote.value = null
  try { notes.value = username ? readTimetableNotes(localStorage, username) : {} } catch {
    notes.value = {}
    storageWarning.value = '无法读取本地课表备注。'
  }
}, { immediate: true })
watch(selectedWeek, () => { editingNote.value = null })
let controller
onBeforeUnmount(() => controller?.abort())
watch(jwglSessionId, () => controller?.abort(), { flush: 'sync' })

async function syncTimetable() {
  if (busy.value || !jwglLoggedIn.value) return
  busy.value = true
  error.value = ''
  controller = new AbortController()
  const syncingUsername = jwglUsername.value
  const syncingSession = jwglSessionId.value
  const request = (body) => jwglRequest('/api/jwgl/timetable', body, { signal: controller.signal })
  function saveWeek(timetable) {
    if (syncingSession !== jwglSessionId.value || controller.signal.aborted) throw new DOMException('同步已取消', 'AbortError')
    const updated = mergeTimetableWeek(cache.value, syncingUsername, timetable)
    const keepSelection = cache.value?.username === syncingUsername
      && updated.weeks.some((week) => week.week === selectedWeek.value)
    storageWarning.value = ''
    try { localStorage.setItem(TIMETABLE_KEY, JSON.stringify(updated)) } catch {
      storageWarning.value = '课表已加载，但浏览器未能保存本地数据；关闭页面后需要重新同步。'
    }
    cache.value = updated
    if (!keepSelection) selectedWeek.value = currentTimetableWeek(updated.weeks) ?? timetable.week
    mode.value = timetable.mode
  }
  try {
    progress.value = '正在读取课表周次…'
    const { timetable: first } = await request(mode.value ? { mode: mode.value } : {})
    saveWeek(first)
    let loadedCount = 1
    for (const week of first.weeks) {
      if (week === first.week) continue
      progress.value = `正在同步第 ${week} 周（${loadedCount}/${first.weeks.length}）…`
      const { timetable } = await request({ week, mode: first.mode })
      saveWeek(timetable)
      loadedCount += 1
    }
  } catch (cause) {
    if (cause.name !== 'AbortError') error.value = `${cause.message}${cache.value ? '，可继续查看已保存的课表。' : ''}`
  } finally {
    busy.value = false
    progress.value = ''
  }
}

const vFocus = { mounted: (el) => el.focus() }

function moveWeek(direction) {
  const index = weeks.value.findIndex((week) => week.week === selectedWeek.value)
  selectedWeek.value = weeks.value[index + direction]?.week ?? selectedWeek.value
}

function groupAt(day, period) {
  return groups.value[day - 1].find((group) => group.start === period)
}

function isCovered(day, period) {
  return groups.value[day - 1].some((group) => group.start < period && group.end >= period)
}

// 同一课程一周内可能出现多次，slot 只用于确定在哪个格子里展开编辑框。
function editNote(course, slot) {
  editingNote.value = { name: course.name, slot, text: notes.value[course.name] || '' }
}

function saveNote() {
  const { name, text } = editingNote.value
  try {
    notes.value = writeTimetableNote(localStorage, cache.value.username, name, text)
    editingNote.value = null
  } catch {
    storageWarning.value = '浏览器未能保存备注，请检查存储空间或隐私设置。'
  }
}
</script>

<template>
  <section class="timetable-page">
    <div class="section-header timetable-heading">
      <div>
        <h2>我的课表</h2>
      </div>
    </div>

    <JwglAuthBar @login="syncTimetable" />

    <div v-if="!cache && jwglLoggedIn && !busy">
      <button class="button-secondary" type="button" @click="syncTimetable">获取课表</button>
    </div>
    <div v-if="busy" class="inline-actions">
      <span role="status">{{ progress }}</span>
      <button class="button-secondary" type="button" @click="controller?.abort()">取消</button>
    </div>

    <p v-if="error" class="notice error" role="alert">{{ error }}</p>
    <p v-if="storageWarning" class="notice" role="status">{{ storageWarning }}</p>

    <template v-if="current">
      <div class="timetable-controls">
        <div class="inline-actions">
          <button class="button-secondary" :disabled="selectedWeek === weeks[0].week" type="button" @click="moveWeek(-1)">上一周</button>
          <select v-model="selectedWeek" aria-label="课表周次">
            <option v-for="week in weeks" :key="week.week" :value="week.week">第 {{ week.week }} 周</option>
          </select>
          <button class="button-secondary" :disabled="selectedWeek === weeks.at(-1).week" type="button" @click="moveWeek(1)">下一周</button>
          <button v-if="currentTimetableWeek(weeks) !== undefined" class="button-secondary" type="button" @click="selectedWeek = currentTimetableWeek(weeks)">本周</button>
        </div>
        <p>{{ cache.username }} · 本地课表 · 同步于 {{ savedAt }}</p>
        <p v-if="missingWeeks.length && !busy">已保存 {{ weeks.length }} 周课表，尚有 {{ missingWeeks.length }} 周未同步。</p>
      </div>
      <p v-if="!current.courses.length" class="notice">第 {{ selectedWeek }} 周暂无课程。</p>

      <div class="timetable-scroll" tabindex="0" aria-label="每周课表，可横向滚动">
        <table class="timetable-grid">
          <caption>第 {{ selectedWeek }} 周 · {{ current.days[0].date }} — {{ current.days[6].date }}</caption>
          <thead><tr>
            <th scope="col">节次</th>
            <th v-for="day in current.days" :key="day.label" scope="col">{{ day.label }}<small>{{ day.date }}</small></th>
          </tr></thead>
          <tbody>
            <tr v-for="period in current.periods" :key="period.number">
              <th scope="row">{{ period.number }}<small>{{ period.time }}</small></th>
              <template v-for="day in 7" :key="day">
                <td
                  v-if="!isCovered(day, period.number)"
                  :class="{ 'timetable-course-cell': groupAt(day, period.number) }"
                  :rowspan="groupAt(day, period.number) ? groupAt(day, period.number).end - period.number + 1 : 1"
                >
                  <article v-for="(course, index) in groupAt(day, period.number)?.courses || []" :key="index" class="timetable-course">
                    <strong>{{ course.name }}</strong>
                    <span>{{ course.location || '地点未标注' }}</span>
                    <span v-if="course.campus">{{ course.campus }}</span>
                    <small>第 {{ course.start }}–{{ course.end }} 节</small>
                    <details><summary>课程详情</summary><p v-for="detail in course.details" :key="detail">{{ detail }}</p></details>
                    <form v-if="editingNote?.slot === `${day}-${period.number}-${index}`" class="timetable-note-editor" @submit.prevent="saveNote" @keydown.esc="editingNote = null">
                      <textarea v-model="editingNote.text" v-focus :aria-label="`${course.name}备注`" placeholder="记录作业、考试、调课…（所有周次共用）" @keydown.enter.meta.prevent="saveNote" @keydown.enter.ctrl.prevent="saveNote"></textarea>
                      <div class="inline-actions">
                        <button type="submit">保存</button>
                        <button class="button-secondary" type="button" @click="editingNote = null">取消</button>
                      </div>
                    </form>
                    <button v-else-if="notes[course.name]" class="timetable-note" type="button" title="编辑课程备注" @click="editNote(course, `${day}-${period.number}-${index}`)">{{ notes[course.name] }}</button>
                    <button v-else class="timetable-note-add" type="button" :aria-label="`为${course.name}添加备注`" @click="editNote(course, `${day}-${period.number}-${index}`)">+ 备注</button>
                  </article>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <div v-else-if="!busy" class="empty-state empty-state-card">
      <strong>暂无课表</strong>
    </div>
    <details v-if="cache" class="timetable-settings">
      <summary>课表设置</summary>
      <div class="timetable-settings-content">
        <div class="inline-actions">
          <label v-if="modes.length > 1">节次模式
            <select v-model="mode" :disabled="busy"><option v-for="item in modes" :key="item.value" :value="item.value">{{ item.label }}</option></select>
          </label>
          <button class="button-secondary" :disabled="busy || !jwglLoggedIn" type="button" @click="syncTimetable">重新同步</button>
        </div>
      </div>
    </details>
  </section>
</template>

<style scoped>
.timetable-page { display: grid; gap: 18px; }
.timetable-heading { flex-wrap: wrap; gap: 12px; }
.timetable-settings { color: var(--muted); font-size: 12px; }
.timetable-settings > summary { cursor: pointer; width: fit-content; }
.timetable-settings-content { display: grid; gap: 14px; padding-top: 12px; }
.timetable-settings-content > .inline-actions { align-items: end; }
.timetable-controls { display: grid; gap: 10px; }
.timetable-controls p { color: var(--muted); font-size: 12px; }
.timetable-controls select { width: auto; }
.timetable-scroll { overflow: auto; border: 1px solid var(--line); border-radius: 10px; background: white; }
.timetable-grid { width: 100%; min-width: 1000px; border-collapse: collapse; table-layout: fixed; }
caption { text-align: left; padding: 14px; font-weight: 650; color: var(--cloud-blue); }
th, td { border: 1px solid var(--line); padding: 6px; }
th { background: var(--cloud-blue-soft); font-size: 13px; }
th:first-child { width: 100px; }
th small { display: block; margin-top: 5px; font-size: 10px; font-weight: 400; color: var(--muted); }
tbody tr { height: 70px; }
td { vertical-align: top; }
.timetable-course-cell { background: #eef4fb; box-shadow: inset 3px 0 var(--cloud-blue); }
.timetable-course { display: grid; gap: 7px; padding: 10px; overflow-wrap: anywhere; }
.timetable-course + .timetable-course { border-top: 1px solid var(--line); }
.timetable-course strong { font-size: 13px; }
.timetable-course span, .timetable-course small { font-size: 11px; color: #52606d; }
.timetable-course details { font-size: 11px; line-height: 1.6; }
.timetable-course summary { cursor: pointer; color: var(--cloud-blue); }
.timetable-course details p { margin-top: 5px; }
.timetable-note, .timetable-note-add { min-height: 0; font-size: 11px; font-weight: 400; line-height: 1.5; text-align: left; }
.timetable-note { display: block; width: 100%; padding: 5px 7px; border: 1px solid #f0d98a; border-radius: 6px; background: #fff8db; color: #5c4a12; white-space: pre-wrap; overflow-wrap: anywhere; }
.timetable-note:not(:disabled):hover { background: #fff1bf; }
.timetable-note-add { justify-self: start; padding: 2px 6px; border: 1px dashed #cbd5e1; background: white; color: var(--muted); }
.timetable-note-add:not(:disabled):hover { background: var(--cloud-blue-soft); color: var(--cloud-blue); }
.timetable-note-editor { display: grid; gap: 6px; }
.timetable-note-editor textarea { min-height: 64px; padding: 6px 8px; font-size: 12px; }
.timetable-note-editor button { min-height: 28px; padding: 0 10px; font-size: 12px; }
.timetable-note-editor .inline-actions { gap: 6px; }
</style>
