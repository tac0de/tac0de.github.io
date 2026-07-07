# Card Camp MVP

Three.js tabletop survival card management prototype for Tacode Arcade.

## Core Loop

1. Keep a survivor fed through the day timer.
2. A short timer produces a resource card.
3. Craft tools, build fire, and arm the survivor.
4. Threat rises at dusk and pushes enemies into the camp.
5. Drag an armed survivor onto enemies to recover meat and hide.
6. Defeat the Alpha Wolf to stabilize the first survival front.

## First Playable Scope

- Cards: `Survivor`, `Berry Bush`, `Tree`, `Berry`, `Wood`, `Stone`, `Campfire`, `Cooked Berry`, `Spear`, `Armed Survivor`, `Wolf`, `Alpha Wolf`, `Meat`, `Hide`, `Rain`, `Cold Night`, `Trader`
- Actions: drag, proximity placement, routine assignment, timed production, event response
- Recipes:
  - `Survivor + Berry Bush -> Berry`
  - `Survivor + Tree -> Wood`
  - `Wood + Stone -> Campfire`
  - `Survivor + Wood -> Spear`
  - `Campfire + Berry -> Cooked Berry`
  - `Survivor + Spear -> Armed Survivor`
  - `Armed Survivor + Wolf -> Meat + Hide`
  - `Armed Survivor + Alpha Wolf -> Hide + Meat`
- Pressure:
  - Survivor eats food every day cycle: `Berry = 1`, `Cooked Berry = 2`, `Meat = 2`
  - Dusk raises `Threat`
  - `Threat >= 3` can bring a `Wolf`
  - `Threat >= 5` brings the `Alpha Wolf`
  - `Cold Night` increases food demand to 2
  - `Rain` slows fire recipes
  - `Trader` can exchange nearby wood or hide for supplies
- Missing food creates a warning state first; two warnings fail the camp
- Win: defeat the `Alpha Wolf`

## Current Build

- Implemented mobile-first drag and forgiving proximity recipe detection
- Implemented timed recipes
- Implemented `Survivor + Berry Bush -> Berry`
- Implemented `Survivor + Tree -> Wood`
- Implemented `Wood + Stone -> Campfire`
- Implemented `Survivor + Wood -> Spear`
- Implemented `Campfire + Berry -> Cooked Berry`
- Implemented `Survivor + Spear -> Armed Survivor`
- Implemented enemy hunt recipes and Alpha Wolf clear condition
- Implemented day timer and food consumption
- Implemented explicit `playing`, `won`, and `lost` camp status
- Implemented threat escalation and two-warning loss condition
- Implemented food values with `Berry = 1`, `Cooked Berry = 2`, `Meat = 2`, and `Cold Night = 2` demand
- Implemented image-generated tactical pictogram sprites, minimal event symbols, and tabletop surface
- Implemented full-viewport Three.js tabletop renderer with 3D card slabs and work bars
- Implemented proximity cooking near campfire
- Implemented Survivor routines for repeated source work
- Implemented dusk event cards
- Implemented DTP project contract with `node scripts/verify.mjs`

## Interaction Rules

- Dragging a card onto a valid target starts a timer when the cards overlap or are close enough for mobile play.
- Dragging a card onto empty table space leaves it where the player dropped it.
- Dropping `Survivor` near a source stores a routine and repeats work while the layout remains valid.
- Placing `Berry` near `Campfire` cooks without requiring an exact stack.
- Dropping `Armed Survivor` onto `Wolf` or `Alpha Wolf` starts a timed fight.
- Invalid combinations briefly warn and separate instead of locking the card back to its origin.
- Valid combinations move into a work state instead of staying visually stuck together.
- Tap-select remains available as a mobile fallback for drag misses.
- Mobile layout keeps initial cards inside the visible table.

## Visual Direction

- Warm tabletop, small paper cards, soft shadows, tactile edges.
- The whole play surface is rendered as a full-viewport Three.js scene, not an inner DOM board.
- Cards should read clearly at phone width with minimal tactical pictograms, stamped borders, and restrained category color.
- Generated item art uses transparent-background sprites cut from a flat chroma-key source.
- Card faces should not show item names; labels live in accessible names and game messages.
- Status should be shown on the card surface before adding side panels.

## Not In First Build

- Large tech tree
- Enemy combat
- Random event deck
- Save system
- Complex inventory management
