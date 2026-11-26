import { backendUrl } from '../utils/runtime.js'

export const UPLOAD_STALL_MS = 45000
export const UPLOAD_RESPONSE_MS = 180000
// 后端经 Cloudflare 代理，单个请求约 100 秒内拿不到响应就会被断开，接近这个时长的失败重试也无济于事
export const PROXY_REQUEST_LIMIT_MS = 90000

function timeoutError(message) {
  const error = new Error(message)
  error.name = 'TimeoutError'
  error.retryable = true
  return error
}

function parseHeaders(raw) {
  const headers = new Headers()
  for (const line of String(raw || '').trim().split(/[\r\n]+/)) {
    const index = line.indexOf(':')
    if (index > 0) {
      try { headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim()) } catch { /* 忽略非法响应头 */ }
    }
  }
  return headers
}

// 大附件在校园网等慢速网络下可能要传几分钟，所以不设总时长上限：
// 上传阶段只在长时间没有进展时放弃，文件发完后再给学校服务器留出处理时间。
export function uploadWithProgress(url, {
  headers = {},
  body,
  onProgress,
  signal,
  stallMs = UPLOAD_STALL_MS,
  responseMs = UPLOAD_RESPONSE_MS,
  XHR = globalThis.XMLHttpRequest,
} = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('上传已取消', 'AbortError'))
      return
    }

    const xhr = new XHR()
    let timer = null
    let failure = null
    const startedAt = Date.now()

    const arm = (ms, message) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        failure = timeoutError(message)
        xhr.abort()
      }, ms)
    }
    const cleanup = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => xhr.abort()

    xhr.open('POST', backendUrl(url))
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)

    xhr.upload.onprogress = (event) => {
      arm(stallMs, '上传长时间没有进展，网络可能不稳定。')
      onProgress?.({ loaded: event.loaded, total: event.lengthComputable ? event.total : 0, elapsedMs: Date.now() - startedAt, sent: false })
    }
    xhr.upload.onload = () => {
      arm(responseMs, '文件已发出，但学校服务器长时间没有响应。')
      onProgress?.({ loaded: 1, total: 1, elapsedMs: Date.now() - startedAt, sent: true })
    }
    xhr.onload = () => {
      cleanup()
      resolve(new Response(xhr.status === 204 ? null : xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
      }))
    }
    xhr.onerror = () => {
      cleanup()
      const elapsedMs = Date.now() - startedAt
      if (elapsedMs >= PROXY_REQUEST_LIMIT_MS) {
        const error = new Error('当前网络下附件无法在 100 秒内传完，请换用更快的网络或压缩附件后重试。')
        error.name = 'ProxyLimitError'
        error.retryable = false
        reject(error)
        return
      }
      const error = new TypeError('网络连接中断，上传失败。')
      error.retryable = true
      reject(error)
    }
    xhr.onabort = () => {
      cleanup()
      reject(failure || new DOMException('上传已取消', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
    arm(stallMs, '上传长时间没有进展，网络可能不稳定。')
    xhr.send(body)
  })
}
