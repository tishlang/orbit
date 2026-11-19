// assets/orbit.svg → assets/orbit.png (512 px, transparent): PopCraft pictures take raster images.
import puppeteer from 'puppeteer'
import { readFileSync } from 'node:fs'
const svg = readFileSync(new URL('../assets/orbit.svg', import.meta.url), 'utf8')
const browser = await puppeteer.launch()
const page = await browser.newPage()
await page.setViewport({ width: 512, height: 512 })
await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:512px;height:512px;display:block}</style>${svg}`)
await page.screenshot({ path: new URL('../assets/orbit.png', import.meta.url).pathname, omitBackground: true })
await browser.close()
