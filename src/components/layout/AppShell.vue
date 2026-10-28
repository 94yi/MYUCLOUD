<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { mountSpacingControl } from '../../vendor/perrin/spacing-control.js'
import { PREVIEW_MESSAGE, STATIC_PREVIEW } from '../../utils/runtime.js'

const props = defineProps({
  userLabel: { type: String, default: '未登录' },
  authenticated: { type: Boolean, default: false },
  activeView: {
    type: String,
    required: true,
  },
  debugEnabled: {
    type: Boolean,
    default: false,
  },
  plugins: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['change-view', 'feedback'])
const shell = ref(null)
let spacing
const pageTitle = computed(() => ({ study: '课程与作业', timetable: '我的课表', course: '课程详情', assignment: '作业详情', debug: '调试' }[props.activeView] || props.plugins.find(p => p.view === props.activeView)?.name || '学习服务'))
onMounted(() => { spacing = mountSpacingControl({ root: shell.value, storageKey: 'snoval-spacing-v1' }) })
onUnmounted(() => spacing?.destroy())
</script>

<template>
  <main ref="shell" class="app-shell ui-app">
    <button class="skip-link" type="button" @click="shell.querySelector('#workspace-content').focus()">跳转到内容</button>
    <header class="app-header">
      <a class="app-brand" href="#study"><span class="brand-mark" aria-hidden="true">u</span><strong>MyUCloud</strong></a>
      <nav class="view-tabs" aria-label="页面">
        <button :aria-current="['study', 'course', 'assignment'].includes(activeView) ? 'page' : undefined" type="button" @click="emit('change-view', 'study')">课程与作业</button>
        <button :aria-current="activeView === 'timetable' ? 'page' : undefined" type="button" @click="emit('change-view', 'timetable')">课表</button>
        <button v-for="p in plugins" :key="p.view" :aria-current="activeView === p.view ? 'page' : undefined" type="button" @click="emit('change-view', p.view)">{{ p.name }}</button>
        <button v-if="debugEnabled" type="button" @click="emit('change-view', 'debug')">调试</button>
      </nav>
      <div class="header-tools"><a href="/geport/">报告封面</a><button v-if="!STATIC_PREVIEW" type="button" @click="emit('feedback')">反馈</button><span v-if="authenticated" class="system-account">{{ userLabel }}</span></div>
    </header>
    <section class="system-main" aria-label="当前页面">
      <div class="system-page-title"><h1>{{ pageTitle }}</h1><span v-if="activeView === 'study'" class="page-description">课程资料与作业安排</span></div>
      <p v-if="STATIC_PREVIEW" class="notice" role="status">{{ PREVIEW_MESSAGE }}</p>
      <div id="workspace-content" class="workspace-content" tabindex="-1"><slot /></div>
    </section>
  </main>
</template>
