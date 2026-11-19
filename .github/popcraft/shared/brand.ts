// Orbit's look: a deep-space ground, glass panels with a hairline edge, the indigo planet of Orbit's favicon
// and a cyan → violet ring. Every picture is 1280 wide, GitHub's README column at 2×.

import type { Kit } from '@popcraft/kit'

export const W = 1280
export const LOGO = new URL('../assets/orbit.png', import.meta.url)

export const COLORS = {
  paper: '#06070F',
  text: '#F3F4FB',
  dim: '#8E92A8',
  faint: '#464A60',
  g1: '#6366F1',
  g2: '#22D3EE',
  g3: '#A78BFA',
}

/** Brand roles (text on the dark ground) and the fixed scenery colors. */
export function orbitBrand(k: Kit) {
  k.brand({ paper: COLORS.paper, text: COLORS.text, primary: COLORS.g1, onPrimary: '#FFFFFF', card: '#12142A', onCard: COLORS.text }, { name: 'Orbit', site: 'github.com/tishlang/orbit' })
  k.palette({
    dim: COLORS.dim,
    faint: COLORS.faint,
    g1: COLORS.g1,
    g2: COLORS.g2,
    g3: COLORS.g3,
    // Glass on the dark sky: the panel, a lighter chip, the hairline edge, the selected row.
    panel: '#11132AF2',
    glass2: '#FFFFFF12',
    line: '#FFFFFF16',
    edge: '#FFFFFF2A',
    hit: '#6366F126',
    hitEdge: '#6366F166',
    // Syntax colors for the code panels.
    kw: '#C4B5FD',
    str: '#67E8F9',
    fn: '#A5B4FC',
    com: '#5C6180',
  })
}
