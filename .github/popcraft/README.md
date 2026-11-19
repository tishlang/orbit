# README animations

The animated pictures in [../assets](../assets) are [PopCraft](https://popcraft.app) templates, written with
`@popcraft/kit` and rendered with the `popcraft` command line (both installed here by `npm install`).

| Template | Picture |
| --- | --- |
| [templates/hero.ts](templates/hero.ts) | `hero.webp`: the planet and wordmark, and one page switching static → server → isr (8 s) |
| [templates/features.ts](templates/features.ts) | `features.webp`: six features with the code that turns each on (6 s) |
| [templates/install.ts](templates/install.ts) | `install.webp`: `orbit new` and `orbit dev` in a terminal (7 s) |

Colors and the logo are in [shared/brand.ts](shared/brand.ts) and [assets/orbit.svg](assets/orbit.svg).

## Render

Needs Node 24, the PopCraft app running locally (it draws the frames), puppeteer's headless Chrome,
`ffmpeg` and `img2webp` (`brew install ffmpeg webp`).

```sh
npm install
./pc.sh template look templates/hero.ts --at 0,2600       # stills to look at, in build/<id>/look
scripts/render.sh hero features install                  # → ../assets/<name>.webp
```

`APP_URL` points the renderer at the app (default `http://localhost:3000`); `POPCRAFT_CLI` at another
build of the command line's `popcraft.mjs`.
