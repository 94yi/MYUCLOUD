import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadWithProgress } from '../src/api/upload.js'

function fakeXhr(script) {
  return class FakeXHR {
    constructor() {
      this.upload = {}
      this.headers = {}
      this.status = 0
      this.statusText = ''
      this.responseText = ''
    }
    open(method, url) { this.method = method; this.url = url }
    setRequestHeader(name, value) { this.headers[name] = value }
    getAllResponseHeaders() { return 'content-type: application/json\r\n' }
    abort() { this.aborted = true; queueMicrotask(() => this.onabort?.()) }
    send(body) { this.body = body; script(this) }
  }
}

test('上传进度持续推进时不受总时长限制，完成后返回学校响应', async () => {
  const progress = []
  const XHR = fakeXhr((xhr) => {
    let loaded = 0
    const tick = setInterval(() => {
      loaded += 25
      xhr.upload.onprogress({ loaded, total: 100, lengthComputable: true })
      if (loaded >= 100) {
        clearInterval(tick)
        xhr.upload.onload()
        setTimeout(() => { xhr.status = 200; xhr.responseText = '{"code":200,"data":"42"}'; xhr.onload() }, 20)
      }
    }, 20)
  })
  const response = await uploadWithProgress('/ucloud/upload', { XHR, stallMs: 50, responseMs: 200, onProgress: (p) => progress.push(p) })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { code: 200, data: '42' })
  assert.ok(progress.some((p) => p.sent))
  assert.equal(progress.filter((p) => !p.sent).at(-1).loaded, 100)
})

test('上传长时间没有进展时以可重试的超时失败', async () => {
  const XHR = fakeXhr((xhr) => { xhr.upload.onprogress({ loaded: 10, total: 100, lengthComputable: true }) })
  await assert.rejects(uploadWithProgress('/ucloud/upload', { XHR, stallMs: 30 }), (error) => error.name === 'TimeoutError' && error.retryable === true)
})

test('网络中断可重试，主动取消不可重试', async () => {
  const broken = fakeXhr((xhr) => setTimeout(() => xhr.onerror(), 5))
  await assert.rejects(uploadWithProgress('/ucloud/upload', { XHR: broken, stallMs: 1000 }), (error) => error.retryable === true)

  const controller = new AbortController()
  const hanging = fakeXhr(() => setTimeout(() => controller.abort(), 5))
  await assert.rejects(uploadWithProgress('/ucloud/upload', { XHR: hanging, stallMs: 1000, signal: controller.signal }), (error) => error.name === 'AbortError' && !error.retryable)
})

test('接近代理 100 秒上限后断开时不再重试', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: 0 })
  const XHR = fakeXhr((xhr) => queueMicrotask(() => { t.mock.timers.tick(95000); xhr.onerror() }))
  await assert.rejects(uploadWithProgress('/ucloud/upload', { XHR, stallMs: 1000000, responseMs: 1000000 }), (error) => error.name === 'ProxyLimitError' && error.retryable === false)
})
