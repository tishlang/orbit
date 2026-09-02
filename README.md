# @tishlang/orbit

A hybrid web framework written in [Tish](https://tishlang.com): file-based routing, markdown collections, JSX layouts, Tailwind-style utilities, SEO, client islands, and per-route **static / server / incremental** rendering with streaming. Builds to the [Vercel Build Output API](https://vercel.com/docs/build-output-api) or a plain Node server.

```
npx @tishlang/orbit new my-site && cd my-site && npm install && npx orbit dev
```

## Project layout

```
orbit.config.tish      site metadata, collections, redirects, tailwind theme
pages/                 routes: index.tish → /, blog/[slug].tish → /blog/:slug, docs/[...path].tish
pages/_layout.tish     nearest-directory layouts (nest freely)
pages/404.tish         not-found page
content/<collection>/  markdown with frontmatter
islands/               client-side modules (.js or .tish) mounted on demand
public/                copied verbatim
styles/*.css           your CSS, prepended to the generated utilities
```

## Pages

```tish
import { raw, articleLd, formatDate } from "@tishlang/orbit"

export let render = "isr"        // "static" (default) | "server" | "isr"
export let revalidate = 3600     // isr: seconds
export let stream = false        // server/isr: flush the shell, stream defer() boundaries

export fn paths(ctx) { return ctx.collections.blog.map(p => ({ params: { slug: p.slug } })) }
export async fn load(ctx) {
  let post = ctx.bySlug(ctx.collections.blog, ctx.params.slug)
  if (post === null) { return { notFound: true } }        // or { redirect: "/x", status: 301 }
  return { props: { post }, headers: { "x-custom": "1" } }
}
export fn head(ctx, props) { return { title: props.post.title, description: props.post.excerpt, type: "article", jsonLd: articleLd(ctx.site, props.post, props.post.url) } }
export fn page(ctx, props) { return <article>{raw(props.post.html)}</article> }
```

`ctx` carries `site`, `path`, `params`, `query`, `headers`, `collections`, `dev`, and helpers `bySlug`, `byTag`, `paginate`, `allTags`, `allItems`. Returning a **string** from `page` writes it verbatim (set `export let contentType = "application/xml"`).

Layouts export `layout(ctx, children, props)` and optionally `head(ctx, props)`; the page's head wins.

### Streaming

```tish
export let render = "server"
export let stream = true
export fn page(ctx) { return <div>{defer(slowPromise(), <p>Loading…</p>)}</div> }
```

The shell flushes immediately; each `defer()` resolves out-of-order and swaps in place.

### Islands

```tish
{island("counter", { start: 3 }, { load: "visible" })}     // idle (default) | visible | eager
```

`islands/counter.js` exports `default function mount(el, props)`. Islands are separate ES modules (natural code splitting); `.tish` islands are compiled to JS. Only pages that use islands ship the loader.

### Runtime (fs / fetch / env)

Site code never imports `tish:*` or `node:*` (they cannot run on the JS target). Use the host shim:

```tish
import { fetch, readFile, env } from "@tishlang/orbit"
export async fn load(ctx) { let r = await fetch("https://api.github.com/…", { headers: { authorization: "bearer " + env("GITHUB_TOKEN") } }); return { props: await r.json() } }
```

The same code runs natively under `tish run` (tests) and under Node/Vercel.

## Config

```tish
export let site = {
  title, description, url, author, lang, twitter, image, icon, themeColor,
  titleTemplate: "%s · Site",
  feeds: { rss: "/rss.xml", atom: "/atom.xml", collections: ["blog"], limit: 30 },
  collections: { blog: { dir: "content/blog", route: "/blog/:slug", sortBy: "date", desc: true, drafts: false } },
  redirects: [{ from: "/old/*", to: "/new/*" }, { from: "/post/:id", to: "/blog/:id", status: 301 }],
  tailwind: { theme: { colors: { brand: { "500": "#6366f1" } }, fonts: {}, screens: {} }, preflight: true },
  styles: ["styles/base.css"],
  head: ['<link rel="preconnect" …>'], bodyEnd: [],
  prefetch: true,                       // hover / viewport link prefetch
  sitemapExclude: ["/drafts/"], robots: ["Disallow: /admin"],
  functionIncludes: ["content"]         // dirs copied into the server function
}
```

Generated automatically: `sitemap.xml`, `robots.txt`, RSS/Atom, canonical + Open Graph + Twitter + JSON-LD tags, hashed stylesheet.

## Tailwind

Utilities are generated from the classes found in your pages, content, and islands: spacing scale, sizing, fractions, typography, the full Tailwind color palette with `/alpha`, borders, radius, shadows, grid, transforms, transitions, animations, and arbitrary values (`w-[42px]`, `bg-[#0ff]`). Variants: `sm…2xl`, `hover`, `focus`, `active`, `group-hover`, `dark`, `first/last/odd/even`, `motion-reduce`, `before/after`, `placeholder`, `[&>p]`. Dynamic class names (`"p-" + n`) are not detected.

## Build & deploy

| Command | Output |
|---|---|
| `orbit dev` | dev server with live reload (`/_orbit/events` SSE) |
| `orbit build --target vercel` | `.vercel/output/` (default when `VERCEL=1`): static pages, ISR prerender functions, one Node function for server routes |
| `orbit build --target node` + `orbit start` | serves `.orbit/static` and runs server/ISR routes in-process with a TTL cache |

On Vercel: framework preset **Other**, build command `npm run build`, no output directory needed. The Tish compiler comes from the `@tishlang/tish` devDependency.

## Tests

```
npx tish test test/
```
