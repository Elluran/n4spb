#!/bin/sh
# usage: tools/landmarksMakarova-ab.sh <module> <tag> [off|on|both] [--close]   (module: landmarksMakarova | landmarksSredny)
# runs shot.mjs at the postcard poses of the module with the trimscan eval; outputs shots/trim/<tag>_{on,off}_N.png and <tag>_{on,off}.json
cd "$(dirname "$0")/.."
EXTRA=""; [ "$4" = "--metro" ] && EXTRA=",metro"; MOD=$1; TAG=$2; WHICH=${3:-both}; CAMARG=$4   # CAMARG: --close for the close poses
case "$MOD" in landmarksMakarova) CT=tools/landmarksMakarova-cams.mjs;; landmarksSredny) CT=tools/landmarksSredny-cams.mjs;; esac
CAMS=$(node $CT $CAMARG | tail -1)
EV=$(node tools/landmarksMakarova-trimscan.mjs "$CAMS")
mkdir -p shots/trim
if [ "$WHICH" != off ]; then node tools/shot.mjs --only environment,streets,city,$MOD$EXTRA --cams "$CAMS" --out shots/trim/${TAG}_on --eval "$EV" --evalout shots/trim/${TAG}_on.json > shots/trim/${TAG}_on.log 2>&1; fi
if [ "$WHICH" != on ]; then node tools/shot.mjs --only environment,streets,city --cams "$CAMS" --out shots/trim/${TAG}_off --eval "$EV" --evalout shots/trim/${TAG}_off.json > shots/trim/${TAG}_off.log 2>&1; fi
echo done
