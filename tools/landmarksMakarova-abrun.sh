#!/bin/sh
# usage: tools/landmarksMakarova-abrun.sh <tag>   runs the module-on shots of BOTH modules (postcard + close poses): shots/trim/<tag>_{mak,sred}{,c}_on_N.png / .json
cd "$(dirname "$0")/.."
T=$1
sh tools/landmarksMakarova-ab.sh landmarksSredny ${T}_sred on
sh tools/landmarksMakarova-ab.sh landmarksSredny ${T}_sredc on --close
sh tools/landmarksMakarova-ab.sh landmarksMakarova ${T}_mak on
sh tools/landmarksMakarova-ab.sh landmarksMakarova ${T}_makc on --close
echo alldone
