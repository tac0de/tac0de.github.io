# Card Camp MVP

Stacklands-inspired card survival prototype for Tacode Arcade.

## Core Loop

1. Drag a worker card onto a source card.
2. A short timer produces a resource card.
3. Stack resource cards onto a craft target.
4. Crafted cards unlock the next small loop.
5. Food pressure forces the player to keep producing berries.

## First Playable Scope

- Cards: `Villager`, `Berry Bush`, `Tree`, `Berry`, `Wood`, `Stone`, `Campfire`, `Cooked Berry`
- Actions: drag, stack, unstack, timed production
- Recipes:
  - `Villager + Berry Bush -> Berry`
  - `Villager + Tree -> Wood`
  - `Wood + Stone -> Campfire`
  - `Campfire + Berry -> Cooked Berry`
- Pressure:
  - Villager eats one food every day cycle
- Missing food creates a warning state first, not instant failure

## Current Build

- Implemented mobile-first drag and strict overlap recipe detection
- Implemented timed recipes
- Implemented `Villager + Berry Bush -> Berry`
- Implemented `Villager + Tree -> Wood`
- Implemented `Wood + Stone -> Campfire`
- Implemented `Campfire + Berry -> Cooked Berry`
- Implemented day timer and food consumption
- Implemented generated card art and tabletop surface

## Interaction Rules

- Dragging a card onto a valid target starts a timer only when the cards visibly overlap.
- Invalid combinations briefly warn and return to their previous position.
- Valid combinations move into a work state instead of staying visually stuck together.
- Tap-select remains available as a mobile fallback for drag misses.
- Mobile layout keeps initial cards inside the visible table.

## Visual Direction

- Warm tabletop, worn paper cards, hard shadows, tactile edges.
- Cards should read clearly at phone width.
- Status should be shown on the card surface before adding side panels.

## Not In First Build

- Large tech tree
- Enemy combat
- Random event deck
- Save system
- Complex inventory management
