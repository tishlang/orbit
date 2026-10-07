import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
export async function scaffold({ dir, template = 'default' }) {
  const src = path.join(here, '..', '..', 'templates', template)
  const dest = path.resolve(dir)
  if (fs.existsSync(dest) && fs.readdirSync(dest).length) throw new Error(dest + ' is not empty')
  // Build output and installs of the template itself stay behind.
  const skip = new Set(['node_modules', '.orbit', '.vercel'])
  fs.cpSync(src, dest, { recursive: true, filter: f => !skip.has(path.basename(f)) })
  const name = path.basename(dest)
  const pkg = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8'))
  pkg.name = name
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(pkg, null, 2))
  console.log(`created ${name}\n\n  cd ${dir}\n  npm install\n  npx orbit dev\n`)
}
