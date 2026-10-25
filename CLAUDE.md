# n4spb - rules for every session

## Versioning (the owner's rule, 2026-10-25)
The game has ONE version number, SemVer `MAJOR.MINOR.PATCH`, starting at 1.0.0. It lives in `src/core/version.js` (shown small in the top right corner of the preloader), mirrored in `package.json`, and every bump is one line in `CHANGELOG.md`.
Raise it on EVERY change that reaches the game or its build (code, data, bake, art, tuning), in the same commit as the change, by `node tools/version.mjs patch|minor|major "what changed"` (it edits the three files). Pick the level by the IMPACT on the player:
- **major**: the world or the hand-off contract changes shape: areas re-cut / added / removed / renamed, a different page or URL protocol, a bake or save format break, a changed core mechanic (movement, driving, transition).
- **minor**: something new the player can see or use: a landmark, a street, a car, a feature, a visible redesign of an area, a new UI element.
- **patch**: no new capability: bug fixes, tuning, performance, collision / data corrections, texts, a re-bake of unchanged content.
Docs-only, tests-only and tooling-only changes do not bump. When one round contains several changes, bump once at the highest level and list them in one line. `node tools/version.mjs` (no arguments) checks that `version.js` and `package.json` agree.

## Commits (the owner's rule, 2026-10-25)
Commit at every checkpoint (a working step: shapes, data, a module, the bake, a feature merged), locally on the working branch, never push. Stage files by name (never `git add -A`); end messages with the Co-Authored-By line. A commit that changes the game carries its version bump (see above).
