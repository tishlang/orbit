(() => {
  let es
  const connect = () => {
    es = new EventSource('/_orbit/events')
    es.addEventListener('reload', () => location.reload())
    es.addEventListener('error', e => { try { console.error('[orbit] ' + JSON.parse(e.data)) } catch {} })
    es.onerror = () => { es.close(); setTimeout(connect, 1000) }
  }
  connect()
})()
