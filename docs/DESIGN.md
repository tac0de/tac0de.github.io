# DESIGN

## Portal Visual Target

The site opens inside a narrow white 3D room. It should feel like the user has
already entered an interactive game layer, not a designed menu page.

Portal composition:

- first-person camera
- white floor, walls, ceiling, and short fog distance
- one dark door only
- tiny low-contrast desktop control overlay
- mobile left stick, right drag, and enter button
- no large title, card, shelf, or button panel
- no flavor text such as "only door"

The portal is only a threshold. Do not add missions, collectible systems, or
large UI to the portal before the first game is playable.

## Visual Target

Low-poly motel horror with readable lighting, limited distance, simple geometry,
and intentionally rough presentation. The scene should feel cheap and
unsettling, not unfinished.

## References

- Puppet Combo: 80s/90s horror, PS1 low-poly aesthetic, harsh silhouettes.
  Reference: https://www.relyonhorror.com/in-depth/interviews/interview-power-drill-massacre-dev-puppet-combo-talks-past-present-future-of-solo-horror-development/
- Chilla's Art: mundane work spaces turned threatening through routine.
  Reference: https://littlegambino.medium.com/chillas-art-horror-in-the-mundane-6e7aca18d164
- Fears to Fathom: grounded first-person psychological horror with short,
  survivor-story framing. Reference: https://rayll.itch.io/fears-to-fathom
- No Players Online: empty low-detail 90s-style space where the player questions
  whether a distant shape is intentional or a glitch.
  Reference: https://bloody-disgusting.com/editorials/3594107/no-players-online-impactful-short-form-horror-abandoned-game-server/

## New Horror Direction

The first game should stop presenting itself as a motel task simulator for now.
Build a smaller horror core first.

Practical rules:

- one location before many rooms
- one repeated route before many objectives
- one clear interaction before inventory
- one impossible change per stage
- no text UI explaining the fear
- no constant jumpscares
- no large open motel until the small version is scary

Lo-fi horror should come from:

- low-poly silhouettes
- low-resolution labels and textures
- sharp room tone changes
- fog that hides distance, not basic navigation
- hard cuts in spatial layout
- props that are readable before they become wrong

## Space Design

The motel must be understandable before it becomes scary.

```txt
Parking Lot / Sign / Cars
        |
Front Window / Entrance
        |
Front Desk / Office
        |
Short Hallway
 |     |     |
201   202   203
             |
          Room 203

Storage / Breaker sits off the hallway or office side.
```

## Required Spaces

### Front Desk

Home base. Required objects:

- guest book
- key rack or key tray
- phone
- CCTV monitor
- wall clock
- front window
- motel map board
- desk bell

### Parking Lot

Must be comparable through direct sight and CCTV.

- parking lines
- one or two parked cars
- motel sign
- street lamp
- vending or ice machine
- office entrance area

### Hallway

Short and memorable.

- doors 201, 202, 203
- readable room signs
- wall lights
- carpet/floor strip
- visible endpoint

### Room 203

The primary horror room.

- bed
- nightstand
- lamp
- window
- TV
- room phone
- bathroom door
- mirror or dark glass

### Storage / Breaker

Small practical work room.

- breaker box
- shelves
- towels
- detergent boxes
- mop bucket
- spare key hook

## Lighting Rules

- Do not rely on pitch black.
- Use ambient light high enough to read the room.
- Use fog to limit distance.
- Use color contrast by area:
  - front desk: dirty warm yellow
  - hallway: cold fluorescent blue
  - parking lot: green-blue sodium light
  - Room 203: warm lamp with uncomfortable shadows
  - storage: dull utility yellow

## Lo-Fi Rules

- primitive low-poly geometry
- clear silhouettes before detail
- generated `CanvasTexture` labels
- subtle scanlines
- mild pixel feel
- no visual effect that hides gameplay information
