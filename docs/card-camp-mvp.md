# Card Camp MVP

Three.js tabletop, Stacklands-inspired card survival prototype for Tacode Arcade.

## Core Loop

1. Place a worker near a source card.
2. A short timer produces a resource card.
3. Useful card proximity starts world rules like cooking by a fire.
4. Worker routines repeat when the camp layout supports them.
5. Dusk event cards change the pressure of the next day.

## First Playable Scope

- Cards: `Villager`, `Berry Bush`, `Tree`, `Berry`, `Wood`, `Stone`, `Campfire`, `Cooked Berry`, `Rain`, `Cold Night`, `Trader`
- Actions: drag, proximity placement, routine assignment, timed production, event response
- Recipes:
  - `Villager + Berry Bush -> Berry`
  - `Villager + Tree -> Wood`
  - `Wood + Stone -> Campfire`
  - `Campfire + Berry -> Cooked Berry`
- Pressure:
  - Villager eats food every day cycle
  - Dusk adds one event card
  - `Cold Night` increases food demand
  - `Rain` slows fire recipes
  - `Trader` can exchange nearby wood for supplies
- Missing food creates a warning state first, not instant failure

## Current Build

- Implemented mobile-first drag and forgiving proximity recipe detection
- Implemented timed recipes
- Implemented `Villager + Berry Bush -> Berry`
- Implemented `Villager + Tree -> Wood`
- Implemented `Wood + Stone -> Campfire`
- Implemented `Campfire + Berry -> Cooked Berry`
- Implemented day timer and food consumption
- Implemented image-generated card icon sprite, minimal event symbols, and tabletop surface
- Implemented Three.js tabletop renderer with 3D card slabs and work bars
- Implemented proximity cooking near campfire
- Implemented Villager routines for repeated source work
- Implemented dusk event cards
- Implemented DTP project contract with `node scripts/verify.mjs`

## Interaction Rules

- Dragging a card onto a valid target starts a timer when the cards overlap or are close enough for mobile play.
- Dragging a card onto empty table space leaves it where the player dropped it.
- Dropping `Villager` near a source stores a routine and repeats work while the layout remains valid.
- Placing `Berry` near `Campfire` cooks without requiring an exact stack.
- Invalid combinations briefly warn and separate instead of locking the card back to its origin.
- Valid combinations move into a work state instead of staying visually stuck together.
- Tap-select remains available as a mobile fallback for drag misses.
- Mobile layout keeps initial cards inside the visible table.

## Visual Direction

- Warm tabletop, small paper cards, soft shadows, tactile edges.
- The card table is rendered as a Three.js scene, not DOM card elements.
- Cards should read clearly at phone width with simple casual generated symbols.
- Card faces should not show item names; labels live in accessible names and game messages.
- Status should be shown on the card surface before adding side panels.

## Not In First Build

- Large tech tree
- Enemy combat
- Random event deck
- Save system
- Complex inventory management
