// Prefetch same-origin links on hover / when visible (Next.js-style).
(() => {
  const done = new Set()
  const ok = a => a.origin === location.origin && !a.hash && a.pathname !== location.pathname && !a.hasAttribute('download') && !a.target
  const prefetch = a => {
    if (!ok(a) || done.has(a.href)) return
    done.add(a.href)
    const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; l.as = 'document'; document.head.appendChild(l)
  }
  const conn = navigator.connection
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return
  document.addEventListener('mouseover', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a) prefetch(a) })
  document.addEventListener('touchstart', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a) prefetch(a) }, { passive: true })
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); (window.requestIdleCallback || setTimeout)(() => prefetch(en.target)) } }))
    const watch = () => document.querySelectorAll('a[href]').forEach(a => { if (ok(a) && a.dataset.prefetch !== 'false') io.observe(a) })
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch()
  }
})()
