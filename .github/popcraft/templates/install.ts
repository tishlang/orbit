// Getting started (1280 × 400, a 7 s loop): a terminal makes a new site and starts the dev server, with the
// lines Orbit really prints. It clears before the end, so the loop begins on an empty prompt again.

import { Kit, preset, defineTemplate, texture, marks } from '@popcraft/kit'
import { orbitBrand, W } from '../shared/brand.ts'

const { glow, blackShadow } = texture
const { dotPaths } = marks

const H = 400
const DUR = 7000

export default defineTemplate({
  id: 'orbit-install',
  meta: {
    name: 'Start an Orbit site',
    description: 'A terminal creates an Orbit site and starts the dev server. A 7 s loop for the README.',
    category: 'animation', tags: ['animation', 'github', 'terminal', 'orbit'],
    platforms: ['github'], formats: ['banner', 'gif'], useCases: ['launch'],
    created: '2026-11-18', updated: '2026-11-18',
  },
  build() {
    const k = new Kit('Start an Orbit site', { ...preset('github-social'), height: H })
    orbitBrand(k)
    k.textStyle('Mono', { size: 21, fontWeight: 500, lineHeight: 32, fontFamily: 'JetBrains Mono' })
    k.textStyle('Mono bold', { size: 21, fontWeight: 800, lineHeight: 32, fontFamily: 'JetBrains Mono' })
    k.textStyle('Bar', { size: 14, fontWeight: 600, lineHeight: 18, fontFamily: 'JetBrains Mono' })

    const sheet = k.sheet
    k.flowSheet(sheet, 0, 0, 'paper')
    k.patch(sheet, { clipsContent: true })
    k.timeline(sheet, { duration: DUR, fps: 30 })
    const light = glow(k, sheet, { x: W / 2, y: H, w: 1200, role: 'g1', alpha: 0.26, name: 'Light' })
    k.behave(light, 'opacity', [{ kind: 'sine', amp: 0.1, freq: 1 / (DUR / 1000) }])
    k.vector(sheet, W, H, dotPaths(W, H, 28, 1.2), 'line', { name: 'Dots', absolute: { x: 0, y: 0 } })

    const TW = 980
    const term = k.stack(sheet, { width: TW, height: 320, radius: 18, fill: 'panel', stroke: { color: 'edge', width: 1.5 }, clip: true, effects: [blackShadow(0.6, 24, 60)], name: 'Terminal', absolute: { x: (W - TW) / 2, y: 40 } })
    const bar = k.stack(term, { direction: 'HORIZONTAL', gap: 8, align: 'CENTER', width: 'FILL', height: 40, padding: { top: 0, right: 16, bottom: 0, left: 16 }, fill: 'glass2', name: 'Title bar' })
    k.palette({ close: '#FF5F57', min: '#FEBC2E', zoom: '#28C840' })
    for (const c of ['close', 'min', 'zoom']) k.ellipse(bar, 12, c, { name: 'Window button' })
    k.text(bar, '~ zsh', { style: 'Bar', color: 'dim', width: 'FILL', align: 'CENTER', name: 'Bar title' })
    const body = k.stack(term, { gap: 2, width: 'FILL', padding: { top: 18, right: 26, bottom: 18, left: 26 }, name: 'Body' })
    const cmd = (text: string, name: string) => {
      const row = k.stack(body, { direction: 'HORIZONTAL', gap: 12, width: 'FILL', name: name + ' prompt' })
      k.text(row, '$', { style: 'Mono bold', color: 'g2', autoWidth: true })
      k.text(row, text, { style: 'Mono', color: 'text', autoWidth: true, name })
    }
    const out = (text: string, color: string, name: string) => k.text(body, text, { style: 'Mono', color, width: 'FILL', name })
    cmd('npx @tishlang/orbit new my-site', 'New')
    out('created my-site', 'dim', 'Created')
    cmd('cd my-site && npm install && npx orbit dev', 'Dev')
    out('ready in 412ms  (2 content items)', 'dim', 'Ready')
    const live = k.stack(body, { direction: 'HORIZONTAL', gap: 12, width: 'FILL', padding: { top: 10, right: 0, bottom: 0, left: 0 }, name: 'Live' })
    k.text(live, 'orbit dev →', { style: 'Mono bold', color: 'text', autoWidth: true })
    k.text(live, 'http://localhost:3000', { style: 'Mono', color: 'g3', autoWidth: true, name: 'Live url' })

    k.cues(sheet, [
      { layer: 'New', preset: 'typewriter', at: 250, params: { duration: 1100 } },
      { layer: 'Created', preset: 'fade-in', at: 1500 },
      { layer: 'Dev', preset: 'typewriter', at: 1900, params: { duration: 1300 } },
      { layer: 'Ready', preset: 'fade-in', at: 3400 },
      { layer: 'Live', preset: 'rise-in', at: 3800 },
      { layer: 'Live url', preset: 'pulse', at: 4700, params: { duration: 500, amount: 0.04 } },
      { layer: 'Created', preset: 'fade-out', at: 6300 },
      { layer: 'Ready', preset: 'fade-out', at: 6300 },
      { layer: 'Live', preset: 'fade-out', at: 6300 },
      { layer: 'New', preset: 'fade-out', at: 6300 },
      { layer: 'Dev', preset: 'fade-out', at: 6300 },
    ])
    return k.finish()
  },
})
