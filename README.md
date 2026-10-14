# Pocket Stash

Short, narrated ideas worth keeping. Each lesson is one JSON file in `lessons/`. The page, offline support and install icons are generated.

## Add a lesson
1. Copy any file in `lessons/` to `lessons/NN-yourid.json` and edit it. Fields:
   - `n` order number (unique), `id` (lowercase letters and digits), `topic`, `secs`, `title`
   - `src` who said it and where (required), `idea`, `apply`, `remind` (one line, 90 characters max)
   - `motif` the tile animation name (see `MOTIFS` in `src/template.html`)
   - `who` one line describing the example person, `scenes` exactly four: Setup, Problem, Apply, Result
2. Scene templates: `list`, `chat`, `quad`, `bars`, `split`, `big`. Each scene needs a `nar` line (8 to 42 words).
3. `python3 tools/build.py --check` validates everything (no dashes, sources present, word counts, audio present).
4. `python3 tools/build.py --render /path/to/kokoro-en-v0_19` renders any missing narration for both voices (needs `pip install sherpa-onnx numpy` and ffmpeg). Existing files are skipped.
5. `python3 tools/build.py` writes the site to `dist/`.
6. Publish `dist/` (GitHub Pages workflow in `.github/workflows/pages.yml` does this on every push).

## New topic or tile
- Topic: add a name and color to `TOPICS` in `src/template.html`.
- Tile animation: add a function and CSS next to the others, then register it in `MOTIFS`.

## Data
Stash, streak and sound settings live in each person's own browser. Nothing is sent anywhere.
