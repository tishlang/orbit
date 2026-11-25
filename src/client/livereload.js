// Dev livereload over SSE. The stream is closed on pagehide so pages left in the back/forward
// cache don't each hold a connection open (6 of those exhaust the browser's per-host limit).
(() => {
  const me = document.currentScript
  const url = (me?.src || '/_orbit/livereload.js').replace(/\/livereload\.js.*$/, '') + '/events'
  let es = null
  let timer = null
  const close = () => { clearTimeout(timer); timer = null; if (es) { es.close(); es = null } }
  const connect = () => {
    close()
    es = new EventSource(url)
    es.addEventListener('reload', () => location.reload())
    es.addEventListener('error', e => { try { console.error('[orbit] ' + JSON.parse(e.data)) } catch {} })
    es.onerror = e => { if (e.data !== undefined) return; close(); timer = setTimeout(connect, 1000) }  // build errors also arrive as `event: error`
  }
  addEventListener('pagehide', close)
  addEventListener('pageshow', e => { if (e.persisted) connect() })
  connect()
})()
