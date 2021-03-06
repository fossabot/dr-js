import { resolve } from 'path'
import { deepEqual, strictEqual } from 'assert'
import { unlinkSync, writeFileSync } from 'fs'
import { URL } from 'url'
import { createServer, createRequestListener, getUnusedPort } from 'source/node/server/Server'
import { responderEndWithStatusCode, responderSendBuffer, responderSendJSON, createResponderParseURL } from 'source/node/server/Responder/Common'
import { createRouteMap, createResponderRouter } from 'source/node/server/Responder/Router'
import { setTimeoutAsync } from 'source/common/time'
import {
  fetch,
  urlToOption,
  pingRequestAsync,
  loadScript,
  loadJSON,
  loadRemoteScript,
  loadRemoteJSON,
  loadLocalScript,
  loadLocalJSON
} from './resource'

const { describe, it, before, after } = global

const BUFFER_SCRIPT = Buffer.from([
  `// Simple script file, used for js test`,
  `const a = async (b = 0) => b + 1`,
  `a().then(console.log)`
].join('\n'))

const SOURCE_JSON = resolve(__dirname, '../../package.json')
const SOURCE_SCRIPT = resolve(__dirname, './test-script-gitignore.js')

const withTestServer = (asyncTest) => async () => {
  const { server, start, stop, option } = createServer({ protocol: 'http:', hostname: 'localhost', port: await getUnusedPort() })
  let retryCount = 0
  server.on('request', createRequestListener({
    responderList: [
      createResponderParseURL(option),
      createResponderRouter(createRouteMap([
        [ '/test-buffer', 'GET', (store) => responderSendBuffer(store, { buffer: Buffer.from('TEST BUFFER') }) ],
        [ '/test-json', 'GET', (store) => responderSendJSON(store, { object: { testKey: 'testValue' } }) ],
        [ '/test-timeout', 'GET', async (store) => {
          await setTimeoutAsync(200)
          return responderEndWithStatusCode(store, { statusCode: 204 })
        } ],
        [ '/test-retry', 'GET', async (store) => {
          retryCount++
          if ((retryCount % 4) !== 0) return store.response.destroy()
          return responderEndWithStatusCode(store, { statusCode: 200 })
        } ],
        [ '/test-script', 'GET', async (store) => responderSendBuffer(store, { buffer: BUFFER_SCRIPT }) ]
      ]))
    ]
  }))
  start()
  await asyncTest(option.baseUrl)
  stop()
}

before('prepare', () => {
  writeFileSync(SOURCE_SCRIPT, BUFFER_SCRIPT)
})

after('clear', () => {
  unlinkSync(SOURCE_SCRIPT)
})

describe('Node.Resource', () => {
  it('urlToOption()', () => {
    const urlObject = new URL('aaa://bbb.ccc:111/ddd?eee=fff#ggg')
    const option = urlToOption(urlObject)
    strictEqual(option.port, 111)
    strictEqual(option.path, '/ddd?eee=fff')
  })

  it('fetch() option: timeout', withTestServer(async (serverUrl) => {
    await fetch(`${serverUrl}/test-timeout`, { timeout: 10 }).then(
      () => { throw new Error('should throw time out error') },
      (error) => `good, expected Error: ${error}`
    )
    await fetch(`${serverUrl}/test-timeout`, { timeout: 50 }).then(
      () => { throw new Error('should throw time out error') },
      (error) => `good, expected Error: ${error}`
    )
    await fetch(`${serverUrl}/test-timeout`, { timeout: 100 }).then(
      () => { throw new Error('should throw time out error') },
      (error) => `good, expected Error: ${error}`
    )
    await fetch(`${serverUrl}/test-timeout`, { timeout: 150 }).then(
      () => { throw new Error('should throw time out error') },
      (error) => `good, expected Error: ${error}`
    )
  }))

  it('fetch() buffer(), text(), json()', withTestServer(async (serverUrl) => {
    strictEqual(Buffer.compare(
      await fetch(`${serverUrl}/test-buffer`, { timeout: 50 }).then((response) => response.buffer()),
      Buffer.from('TEST BUFFER')
    ), 0)
    strictEqual(
      await fetch(`${serverUrl}/test-buffer`, { timeout: 50 }).then((response) => response.text()),
      'TEST BUFFER'
    )
    deepEqual(
      await fetch(`${serverUrl}/test-json`, { timeout: 50 }).then((response) => response.json()),
      { testKey: 'testValue' }
    )
  }))

  it('fetch() should allow receive response data multiple times (cached)', withTestServer(async (serverUrl) => {
    const response = await fetch(`${serverUrl}/test-buffer`, { timeout: 50 })
    strictEqual(Buffer.compare(await response.buffer(), Buffer.from('TEST BUFFER')), 0)
    strictEqual(Buffer.compare(await response.buffer(), Buffer.from('TEST BUFFER')), 0)
    await setTimeoutAsync(0)
    strictEqual(Buffer.compare(await response.buffer(), Buffer.from('TEST BUFFER')), 0)
    strictEqual(await response.text(), 'TEST BUFFER')
  }))

  it('fetch() unreceived response should clear up on next tick and throw when try to access', withTestServer(async (serverUrl) => {
    const response = await fetch(`${serverUrl}/test-buffer`, { timeout: 50 })
    await setTimeoutAsync(0)
    await response.buffer().then(
      () => { throw new Error('should throw data already dropped error') },
      (error) => `good, expected Error: ${error}`
    )
  }))

  it('pingRequestAsync() simple test', withTestServer(async (serverUrl) => {
    await pingRequestAsync({ url: `${serverUrl}/test-buffer` })
    await pingRequestAsync({ url: `${serverUrl}/test-json` })
  }))

  it('pingRequestAsync() timeout', withTestServer(async (serverUrl) => {
    await pingRequestAsync({ url: `${serverUrl}/test-buffer`, timeout: 10 })
    await pingRequestAsync({ url: `${serverUrl}/test-timeout`, timeout: 150, retryCount: 2 }).then(
      () => { throw new Error('should throw ping timeout error') },
      (error) => `good, expected Error: ${error}`
    )
  }))

  it('pingRequestAsync() retryCount', withTestServer(async (serverUrl) => { // total ping = 1 + retryCount
    await pingRequestAsync({ url: `${serverUrl}/test-retry`, timeout: 10, retryCount: 2 }).then(
      () => { throw new Error('should throw retry error') },
      (error) => `good, expected Error: ${error}`
    )
    await pingRequestAsync({ url: `${serverUrl}/test-retry`, timeout: 10, retryCount: 0 }) // 4, pass
    await pingRequestAsync({ url: `${serverUrl}/test-retry`, timeout: 10, retryCount: 3 }) // 4, pass
    await pingRequestAsync({ url: `${serverUrl}/test-retry`, timeout: 10, retryCount: 2 }).then(
      () => { throw new Error('should throw retry error') },
      (error) => `good, expected Error: ${error}`
    )
    await pingRequestAsync({ url: `${serverUrl}/test-retry`, timeout: 10, retryCount: 0 }) // 4, pass
  }))

  it('loadScript()', withTestServer(async (serverUrl) => {
    await loadScript(SOURCE_SCRIPT)
    await loadScript(`${serverUrl}/test-script`)
  }))

  it('loadJSON()', withTestServer(async (serverUrl) => {
    await loadJSON(SOURCE_JSON)
    await loadJSON(`${serverUrl}/test-json`)
  }))

  it('loadLocalScript()', async () => {
    await loadLocalScript(SOURCE_SCRIPT)
  })
  it('loadLocalJSON()', async () => {
    await loadLocalJSON(SOURCE_JSON)
  })

  it('loadRemoteScript()', withTestServer(async (serverUrl) => {
    await loadRemoteScript(`${serverUrl}/test-script`)
  }))
  it('loadRemoteJSON()', withTestServer(async (serverUrl) => {
    await loadRemoteJSON(`${serverUrl}/test-json`)
  }))
})
