# Daggerheart Compact Adversary Sheet

Compact adversary sheet module for Foundry VTT 13/14 and the Foundryborne Daggerheart system.

## Highlights

- Compact paper-card layout focused on fast combat readability
- Quick pip controls for hit points and stress
- Keeps the system item/effect partials, so core sheet actions still work
- Clean module structure with shared constants and context builders

## Structure

- `scripts/main.js` - module bootstrap, settings, and sheet registration
- `scripts/constants.js` - shared ids, paths, and config
- `scripts/utils.js` - compact-context builders and data normalization helpers
- `scripts/compact-adversary-sheet.js` - compact sheet subclass
