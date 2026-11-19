// The README hero (1280 × 540, an 8 s loop): Orbit's planet and wordmark on the left, a moon going round it;
// on the right one page file whose `render` line switches static → server → isr → static, and the build line
// under it saying what Orbit makes of each. Everything is in place on the first frame (GitHub shows it before
// the loop starts); the motion closes in 8 s.

import { Kit, preset, defineTemplate, media, ease, texture, marks } from '@popcraft/kit'
import { orbitBrand, LOGO, W } from '../shared/brand.ts'

const { glow, halo, blackShadow } = texture
const { dotPaths } = marks

const DUR = 8000
const H = 540
// [render mode, what the build makes of it, its short name]
const MODES: [string, string, string][] = [
  ["'static'", 'prerendered to HTML at build time', 'SSG'],
  ["'server'", 'rendered per request, streamed', 'SSR'],
  ["'isr'", 'cached, revalidated every hour', 'ISR'],
  ["'static'", 'prerendered to HTML at build time', 'SSG'],
]
const STEP = DUR / MODES.length

export default defineTemplate({
  id: 'orbit-hero',
  meta: {
    name: 'Orbit README hero',
    description: 'Orbit, the Tish web framework: the planet and wordmark, and one page file switching between static, server and incremental rendering. An 8 s loop for the README.',
    category: 'animation', tags: ['animation', 'github', 'framework', 'orbit'],
    platforms: ['github'], formats: ['banner', 'gif'], useCases: ['brand-intro'],
    created: '2026-11-18', updated: '2026-11-18',
  },
  build() {
    const k = new Kit('Orbit README hero', { ...preset('github-social'), height: H })
    orbitBrand(k)
    k.textStyle('Wordmark', { size: 140, fontWeight: 900, letterSpacing: -6, lineHeight: 140 })
    k.textStyle('Tagline', { size: 31, fontWeight: 700, letterSpacing: -0.6, lineHeight: 40 })
    k.textStyle('Lead', { size: 20, fontWeight: 400, lineHeight: 30 })
    k.textStyle('Code', { size: 19, fontWeight: 500, lineHeight: 31, fontFamily: 'JetBrains Mono' })
    k.textStyle('Bar', { size: 14, fontWeight: 600, lineHeight: 18, fontFamily: 'JetBrains Mono' })
    k.textStyle('Out', { size: 16, fontWeight: 600, lineHeight: 22, fontFamily: 'JetBrains Mono' })

    const sheet = k.sheet
    k.nameSheet(sheet, 'Hero')
    k.flowSheet(sheet, 0, 0, 'paper')
    k.patch(sheet, { clipsContent: true })
    k.timeline(sheet, { duration: DUR, fps: 30 })

    // The sky: an indigo and a cyan light that breathe, and a dot grid.
    const a = glow(k, sheet, { x: 240, y: 140, w: 900, role: 'g1', alpha: 0.34, name: 'Indigo light' })
    const b = glow(k, sheet, { x: 1080, y: 500, w: 1000, role: 'g2', alpha: 0.2, name: 'Cyan light' })
    k.behave(a, 'opacity', [{ kind: 'sine', amp: 0.16, freq: 1 / (DUR / 1000) }])
    k.behave(b, 'opacity', [{ kind: 'sine', amp: 0.16, freq: 1 / (DUR / 1000), phase: 0.5 }])
    k.vector(sheet, W, H, dotPaths(W, H, 28, 1.2), 'line', { name: 'Dots', opacity: 0.9, absolute: { x: 0, y: 0 } })

    // Left: the planet, the wordmark and what Orbit is.
    const left = k.stack(sheet, { gap: 16, width: 540, name: 'Brand', absolute: { x: 72, y: 56 } })
    const logo = k.stack(left, { width: 120, height: 120, name: 'Logo', effects: [halo(k, 'g1', 0.5, 40)] })
    k.picture(logo, media(LOGO), 120, 120, { name: 'Orbit planet', fit: 'FIT' })
    // A moon on the ring: one lap per loop, round an ellipse tilted like the logo's.
    const moon = k.ellipse(sheet, 12, 'g2', { name: 'Moon', effects: [halo(k, 'g2', 0.8, 16)], absolute: { x: 72 + 60 - 6, y: 56 + 60 - 6 } })
    const xs: { t: number; v: number; ease?: unknown }[] = [], ys: typeof xs = []
    const N = 48, tilt = -20 * Math.PI / 180
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * Math.PI * 2, ex = 53 * Math.cos(th), ey = 19 * Math.sin(th)
      xs.push({ t: (i / N) * DUR, v: ex * Math.cos(tilt) - ey * Math.sin(tilt), ease: ease.linear })
      ys.push({ t: (i / N) * DUR, v: ex * Math.sin(tilt) + ey * Math.cos(tilt), ease: ease.linear })
    }
    k.animate(moon, 'translateX', xs as never)
    k.animate(moon, 'translateY', ys as never)
    const mark = k.text(left, 'Orbit', { style: 'Wordmark', color: 'text', autoWidth: true, name: 'Wordmark' })
    k.patch(mark, { fills: [k.gradient({ from: 'g2', to: 'g3', kind: 'LINEAR', angle: 0 })] })
    k.text(left, 'Markdown in. Fast sites out.', { style: 'Tagline', color: 'text', width: 'FILL', name: 'Tagline' })
    k.text(left, 'A web framework written in Tish. Static, server or incremental rendering, chosen per route.', { style: 'Lead', color: 'dim', width: 'FILL', name: 'Lead' })

    // Right: the page file.
    const PX = 660, PY = 70, PW = 560
    const ed = k.stack(sheet, { width: PW, height: 'HUG', radius: 22, fill: 'panel', stroke: { color: 'edge', width: 1.5 }, clip: true, effects: [blackShadow(0.6, 30, 80)], name: 'Editor', absolute: { x: PX, y: PY } })
    const bar = k.stack(ed, { direction: 'HORIZONTAL', gap: 8, align: 'CENTER', width: 'FILL', height: 42, padding: { top: 0, right: 16, bottom: 0, left: 16 }, fill: 'glass2', name: 'Title bar' })
    k.palette({ close: '#FF5F57', min: '#FEBC2E', zoom: '#28C840' })
    for (const c of ['close', 'min', 'zoom']) k.ellipse(bar, 12, c, { name: 'Window button' })
    k.text(bar, 'pages/blog/[slug].tish', { style: 'Bar', color: 'dim', width: 'FILL', align: 'CENTER', name: 'File name' })
    const code = k.stack(ed, { gap: 0, width: 'FILL', padding: { top: 18, right: 24, bottom: 18, left: 24 }, name: 'Code' })
    const line = (parts: [string, string][], name = 'Line') => {
      const row = k.stack(code, { direction: 'HORIZONTAL', width: 'FILL', name })
      parts.forEach(([t, c], i) => k.text(row, t, { style: 'Code', color: c, autoWidth: true, name: name === 'Line' ? 'Token' : `${name} ${i}` }))
      return row
    }
    line([['export let ', 'kw'], ['render', 'text'], [' = ', 'dim'], [MODES[0][0], 'str']], 'Render')
    line([['export let ', 'kw'], ['revalidate', 'text'], [' = ', 'dim'], ['3600', 'str']])
    line([[' ', 'dim']])
    line([['export fn ', 'kw'], ['page', 'fn'], ['(ctx, props) {', 'dim']])
    line([['  return ', 'kw'], ['raw', 'fn'], ['(props.post.html)', 'text']])
    line([['}', 'dim']])
    // The build line: what Orbit made of the page.
    k.patch(k.rect(ed, 10, 1, 'line', { name: 'Divider' }), { layoutSizingHorizontal: 'FILL' })
    const out = k.stack(ed, { direction: 'HORIZONTAL', gap: 12, align: 'CENTER', width: 'FILL', height: 58, padding: { top: 0, right: 24, bottom: 0, left: 24 }, fill: 'hit', name: 'Build' })
    k.text(out, MODES[0][2], { style: 'Out', color: 'g2', width: 40, name: 'Glyph' })
    k.text(out, '/blog/hello/', { style: 'Out', color: 'text', autoWidth: true, name: 'Route' })
    k.text(out, MODES[0][1], { style: 'Out', color: 'dim', width: 'FILL', name: 'Made' })

    // The switch: the value in the render line, the glyph and the description change together.
    const IN = 260, OUT = 160, HOLD = STEP - IN - OUT
    const words = (i: number) => MODES.map(m => m[i])
    k.swaps(sheet, [
      { layer: 'Render 3', words: words(0), at: 0, hold: HOLD, stagger: 0, in: IN, out: OUT, unit: 'word', rise: -10 },
      { layer: 'Glyph', words: words(2), at: 100, hold: HOLD - 100, stagger: 0, in: IN, out: OUT, unit: 'word', rise: 8 },
      { layer: 'Made', words: words(1), at: 100, hold: HOLD - 100, stagger: 0, in: IN, out: OUT, unit: 'line', rise: 10 },
    ])
    for (let i = 0; i < MODES.length; i++) {
      k.cues(sheet, [{ layer: 'Build', preset: 'pulse', at: i * STEP + 600, params: { duration: 420, amount: 0.02 } }])
    }
    return k.finish()
  },
})
