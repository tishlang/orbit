// Orbit island loader: mounts [data-island] elements by importing their module on demand.
(() => {
  const me = document.currentScript || document.querySelector('script[data-manifest]')
  const manifest = JSON.parse(me?.dataset.manifest || '{}')
  const base = (me?.src || '/_orbit/islands.js').replace(/\/islands\.js.*$/, '')
  const mounted = new WeakSet()
  const mount = async el => {
    if (mounted.has(el)) return
    mounted.add(el)
    const name = el.dataset.island
    const file = manifest[name] || name + '.js'
    try {
      const mod = await import(`${base}/islands/${file}`)
      const fn = mod.default || mod.mount
      const props = JSON.parse(el.dataset.props || '{}')
      el.dataset.mounted = '1'
      if (typeof fn === 'function') await fn(el, props)
    } catch (e) { console.error(`orbit island "${name}" failed:`, e) }
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target) } }), { rootMargin: '200px' }) : null
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 1))
  const scan = (scope = document) => {
    for (const el of scope.querySelectorAll('[data-island]:not([data-mounted])')) {
      const mode = el.dataset.load || 'idle'
      if (mode === 'eager') mount(el)
      else if (mode === 'visible' && io) io.observe(el)
      else idle(() => mount(el))
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan()); else scan()
  document.addEventListener('orbit:chunk', () => scan())
  window.orbit = Object.assign(window.orbit || {}, { mountIslands: scan })
})()
