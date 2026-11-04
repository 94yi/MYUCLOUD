import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../deploy/worker.js'

test('geport canonical URL preserves queries and serves its own index', async () => {
  const redirect = await worker.fetch(new Request('https://snoval.link/geport?from=home'), {})
  assert.equal(redirect.status, 308)
  assert.equal(redirect.headers.get('location'), 'https://snoval.link/geport/?from=home')
  const env = { ASSETS: { fetch: request => new Response(new URL(request.url).pathname) } }
  assert.equal(await (await worker.fetch(new Request('https://snoval.link/geport/'), env)).text(), '/geport/')
  assert.equal(await (await worker.fetch(new Request('https://snoval.link/assets/app.js'), env)).text(), '/assets/app.js')
})

test('same-origin proxy preserves auth, upload bodies and Range without caching', async t => {
  let proxied
  t.mock.method(globalThis, 'fetch', async request => {
    proxied = request
    return new Response('chunk', { status: 206, headers: { 'Content-Range': 'bytes 0-4/10', 'Access-Control-Allow-Origin': '*' } })
  })
  const response = await worker.fetch(new Request('https://snoval.link/ucloud/upload?name=a%20b', {
    method: 'POST', headers: { 'Blade-Auth': 'test-token', Cookie: 'private=cookie', Range: 'bytes=0-4' }, body: 'upload-content',
  }), {})
  assert.equal(proxied.url, 'https://myu.aucept.in/ucloud/upload?name=a%20b')
  assert.equal(await proxied.text(), 'upload-content')
  assert.equal(proxied.headers.get('Blade-Auth'), 'test-token')
  assert.equal(proxied.headers.get('Range'), 'bytes=0-4')
  assert.equal(proxied.headers.get('Cookie'), null)
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('Content-Range'), 'bytes 0-4/10')
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null)
})

test('proxy failure returns a readable error, similar static paths never hit backend', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  assert.equal((await worker.fetch(new Request('https://snoval.link/api/login'), {})).status, 502)
  const env = { ASSETS: { fetch: () => new Response('static') } }
  assert.equal(await (await worker.fetch(new Request('https://snoval.link/api-example'), env)).text(), 'static')
})
