// What Orbit does (1280 × 560, a 6 s loop): six tiles, each a feature with the code that turns it on and what it
// gives you, and a selection stepping through them once a second. The loop ends on the tile it started on.

import { Kit, preset, defineTemplate, ease, texture, marks } from '@popcraft/kit'
import { orbitBrand, W } from '../shared/brand.ts'

const { glow, blackShadow, halo } = texture
const { dotPaths } = marks

const H = 560
const DUR = 6000
const FEATURES: [string, string, string, string][] = [
  ['File-based routing', 'Pages, nested layouts and dynamic segments.', 'blog/[slug].tish', '/blog/:slug'],
  ['Markdown collections', 'Frontmatter, tags, drafts, prev/next, pagination.', 'content/*.md', 'ctx.collections'],
  ['Rendering per route', 'Static, server or incremental, page by page.', "render = 'isr'", 'cached 1h'],
  ['Islands', 'Ship JavaScript only where a page needs it.', "island('chart')", 'when visible'],
  ['Tailwind built in', 'Utilities generated from the classes you use.', 'p-4 dark:bg-…', 'only what you use'],
  ['SEO and feeds', 'Canonical, Open Graph, JSON-LD, sitemap, RSS.', 'orbit build', 'all generated'],
]
const COLS = 3, TW = 368, TH = 172, GAP = 24
const GX = (W - COLS * TW - (COLS - 1) * GAP) / 2, GY = 160
const at = (i: number) => ({ x: GX + (i % COLS) * (TW + GAP), y: GY + Math.floor(i / COLS) * (TH + GAP) })

export default defineTemplate({
  id: 'orbit-features',
  meta: {
    name: 'Orbit features',
    description: 'What Orbit does: six features with the code that turns each on, and a selection stepping through them. A 6 s loop for the README.',
    category: 'animation', tags: ['animation', 'github', 'framework', 'orbit'],
    platforms: ['github'], formats: ['banner', 'gif'], useCases: ['education'],
    created: '2026-11-18', updated: '2026-11-18',
  },
  build() {
    const k = new Kit('Orbit features', { ...preset('github-social'), height: H })
    orbitBrand(k)
    k.textStyle('Kicker', { size: 15, fontWeight: 700, letterSpacing: 2, lineHeight: 20, fontFamily: 'JetBrains Mono' })
    k.textStyle('Title', { size: 44, fontWeight: 800, letterSpacing: -1.4, lineHeight: 52 })
    k.textStyle('Tile title', { size: 23, fontWeight: 700, letterSpacing: -0.3, lineHeight: 30 })
    k.textStyle('Tile body', { size: 16, fontWeight: 400, lineHeight: 23 })
    k.textStyle('Query', { size: 15, fontWeight: 500, lineHeight: 20, fontFamily: 'JetBrains Mono' })

    const sheet = k.sheet
    k.flowSheet(sheet, 0, 0, 'paper')
    k.patch(sheet, { clipsContent: true })
    k.timeline(sheet, { duration: DUR, fps: 30 })
    const light = glow(k, sheet, { x: W / 2, y: 40, w: 1100, role: 'g1', alpha: 0.24, name: 'Light' })
    k.behave(light, 'opacity', [{ kind: 'sine', amp: 0.12, freq: 1 / (DUR / 1000) }])
    k.vector(sheet, W, H, dotPaths(W, H, 28, 1.2), 'line', { name: 'Dots', absolute: { x: 0, y: 0 } })

    const head = k.stack(sheet, { gap: 8, width: W - 2 * GX, name: 'Heading', absolute: { x: GX, y: 48 } })
    k.text(head, 'WHAT YOU GET', { style: 'Kicker', color: 'g2', autoWidth: true, name: 'Kicker' })
    k.text(head, 'A whole site from one Tish codebase.', { style: 'Title', color: 'text', width: 'FILL', name: 'Title' })

    // The selection: behind the tiles, gliding to the next one each second.
    const sel = k.rect(sheet, TW + 8, TH + 8, 'hit', { radius: 22, name: 'Selection', stroke: { color: 'g2', width: 2 }, effects: [halo(k, 'g2', 0.4, 36)], absolute: { x: at(0).x - 4, y: at(0).y - 4 } })
    const xs: { t: number; v: number; ease?: unknown }[] = [], ys: typeof xs = []
    for (let i = 0; i <= FEATURES.length; i++) {
      const p = at(i % FEATURES.length), p0 = at(0)
      const t = i * 1000
      xs.push({ t, v: p.x - p0.x, ease: ease.hold }, { t: t + 760, v: p.x - p0.x, ease: ease.inOut('cubic') })
      ys.push({ t, v: p.y - p0.y, ease: ease.hold }, { t: t + 760, v: p.y - p0.y, ease: ease.inOut('cubic') })
    }
    k.animate(sel, 'translateX', xs.filter(kf => kf.t <= DUR) as never)
    k.animate(sel, 'translateY', ys.filter(kf => kf.t <= DUR) as never)

    FEATURES.forEach(([title, body, query, answer], i) => {
      const tile = k.stack(sheet, { gap: 10, width: TW, height: TH, radius: 18, padding: 22, fill: 'panel', stroke: { color: 'line', width: 1 }, effects: [blackShadow(0.5, 16, 40)], name: 'Tile', absolute: at(i) })
      k.text(tile, title, { style: 'Tile title', color: 'text', width: 'FILL', name: 'Tile title' })
      k.text(tile, body, { style: 'Tile body', color: 'dim', width: 'FILL', name: 'Tile body' })
      const pill = k.stack(tile, { direction: 'HORIZONTAL', gap: 10, align: 'CENTER', width: 'HUG', radius: 10, padding: { top: 7, right: 12, bottom: 7, left: 12 }, fill: 'glass2', name: 'Example' })
      k.text(pill, query, { style: 'Query', color: 'text', autoWidth: true, name: 'Example code' })
      k.text(pill, '->', { style: 'Query', color: 'g2', autoWidth: true, name: 'Arrow' })
      k.text(pill, answer, { style: 'Query', color: 'g3', autoWidth: true, name: 'Example result' })
    })
    k.cues(sheet, [{ layer: 'Example', preset: 'pulse', at: 760, params: { duration: 360, amount: 0.05 }, stagger: { delay: 1000 } }])
    return k.finish()
  },
})
