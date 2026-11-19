#!/bin/sh
# The PopCraft command line installed beside the templates (npm install), or POPCRAFT_CLI.
if [ -n "$POPCRAFT_CLI" ]; then exec node "$POPCRAFT_CLI" "$@"; fi
exec "$(dirname "$0")/node_modules/.bin/popcraft" "$@"
