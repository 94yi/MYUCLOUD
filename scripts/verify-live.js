import assert from 'node:assert/strict'
const origin = process.argv[2] || 'https://snoval.link'
for (const path of ['/', '/geport/', '/geport/assets/bupt-title.png', '/geport/assets/bupt-logo.png']) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual' })
  assert.equal(response.status, 200, path)
  console.log(path, response.status, response.headers.get('content-type'))
  if (path.endsWith('/')) {
    const html = await response.text()
    console.log(html.match(/<title>(.*?)<\/title>/)?.[1])
    for (const asset of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
      const result = await fetch(new URL(asset[1], origin))
      assert.equal(result.status, 200, asset[1])
      assert.match(result.headers.get('content-type'), /javascript|css/)
      console.log(asset[1], result.status)
    }
  }
}
const redirect = await fetch(new URL('/geport', origin), { redirect: 'manual' })
assert.equal(redirect.status, 308)
assert.equal(redirect.headers.get('location'), `${origin}/geport/`)
const api = await fetch(new URL('/api/health', origin))
assert.equal(api.status, 404)
assert.equal((await api.json()).msg, '接口不存在')
console.log('Redirect and backend JSON verified')
