#!/usr/bin/env bash
# ============================================================================
# BlimBlom — Download ESC-50 Forest & Chainsaw Audio Clips into public/audio/
# Credit: Sound clips from ESC-50 (Piczak, 2015), CC BY-NC 3.0
# ============================================================================

set -e

mkdir -p public/audio

BASE_URL="https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio"

echo "Downloading chainsaw clip (chainsaw_1.wav) from ESC-50..."
curl -L -sS "${BASE_URL}/1-116765-A-41.wav" -o public/audio/chainsaw_1.wav

echo "Downloading normal forest crickets clip (crickets_1.wav) from ESC-50..."
curl -L -sS "${BASE_URL}/1-100032-A-0.wav" -o public/audio/crickets_1.wav

echo "Done! Files saved in public/audio/:"
ls -lh public/audio/
echo ""
echo "Note: Place your two elephant clips (10s max) at:"
echo "  - public/audio/elephant_1.mp3"
echo "  - public/audio/elephant_2.mp3"
