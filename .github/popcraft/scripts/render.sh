#!/bin/sh
# Render templates to looping animated WebPs for the README.
#   scripts/render.sh hero [features install]   → ../assets/<name>.webp
# Needs the PopCraft app running (APP_URL, default http://localhost:3000), ffmpeg and img2webp.
set -e
cd "$(dirname "$0")/.."
FPS=${FPS:-24}
export APP_URL=${APP_URL:-http://localhost:3000}
mkdir -p ../assets
for name in "$@"; do
  id="orbit-$name"
  ./pc.sh template build "templates/$name.ts" >/dev/null
  frame=$(node scripts/inline.mjs "build/$id" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].id))')
  out="frames/$name"; rm -rf "$out"
  node scripts/seq-export.mjs "build/$id/$id.inline.popcraft" "$frame" "$out" | tail -1
  mkdir -p "$out/s"
  ffmpeg -nostdin -loglevel error -y -framerate 30 -i "$out/f_%05d.png" -vf "fps=$FPS,scale=${WIDTH:-1280}:-2:flags=lanczos" "$out/s/f_%04d.png"
  # A keyframe every KMAX frames: lossy frames stored as changed rectangles otherwise pile up their errors.
  img2webp -loop 0 -kmin $((${KMAX:-6} - 1)) -kmax "${KMAX:-6}" -lossy -q "${Q:-72}" -m 6 -d $((1000 / FPS)) "$out"/s/f_*.png -o "../assets/$name.webp" >/dev/null
  echo "$name: $(du -h "../assets/$name.webp" | cut -f1)"
done
