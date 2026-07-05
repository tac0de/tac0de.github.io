# Untitled Card Camp MVP

Stacklands-inspired card survival prototype for Tacode Arcade.

## Core Loop

1. Drag a worker card onto a source card.
2. A short timer produces a resource card.
3. Stack resource cards onto a craft target.
4. Crafted cards unlock the next small loop.
5. Food pressure forces the player to keep producing berries.

## First Playable Scope

- Cards: `Villager`, `Berry Bush`, `Berry`, `Wood`, `Stone`, `Campfire`
- Actions: drag, stack, unstack, timed production
- Recipes:
  - `Villager + Berry Bush -> Berry`
  - `Villager + Tree -> Wood`
  - `Wood + Stone -> Campfire`
  - `Villager + Campfire + Berry -> Cooked Berry`
- Pressure:
  - Villager eats one food every day cycle
- Missing food creates a warning state first, not instant failure

## Current Build

- Implemented drag and stack detection
- Implemented timed recipes
- Implemented `Villager + Berry Bush -> Berry`
- Implemented `Villager + Tree -> Wood`
- Implemented `Wood + Stone -> Campfire`
- Implemented day timer and berry consumption

## Interaction Rules

- A stack is a vertical pile of cards with a single top target.
- Dragging a card onto a valid target starts a timer.
- Invalid combinations briefly shake and separate.
- Timers pause while the card is being dragged.
- Mobile drag must prioritize large hit targets and clear stacking feedback.

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
