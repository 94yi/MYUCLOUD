// Keep the existing MYUCLOUD backend behind the site's same-origin API paths.
const backendPrefixes = ['/api', '/ucloud', '/file', '/jwgl', '/office']
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (backendPrefixes.some(prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      const target = new URL(url.pathname + url.search, 'https://myu.aucept.in')
      const headers = new Headers(request.headers)
      headers.delete('host')
      headers.delete('cookie')
      // Existing backend's configured frontend origin; requests stay same-origin to the browser.
      headers.set('origin', 'https://u.aucept.in')
      headers.set('referer', 'https://u.aucept.in/')
      try {
        const upstream = await fetch(new Request(target, {
          method: request.method, headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          duplex: 'half',
          redirect: 'manual',
        }))
        const response = new Response(upstream.body, upstream)
        response.headers.set('Cache-Control', 'no-store')
        for (const name of [...response.headers.keys()]) {
          if (name.startsWith('access-control-')) response.headers.delete(name)
        }
        return response
      } catch {
        return Response.json({ success: false, msg: '学习服务暂时无法连接，请稍后重试' }, { status: 502 })
      }
    }
    if (url.pathname === '/geport') {
      url.pathname = '/geport/'
      return Response.redirect(url.href, 308)
    }
    return env.ASSETS.fetch(request)
  },
}
