# DESIGN

## Portal Visual Target

The site opens inside a sparse white 3D space. It should feel like the user has
already entered an interactive game layer, not a designed menu page.

Portal composition:

- first-person camera
- white floor, walls, and fog
- one dark `NO VACANCY` entrance
- faint locked future doors
- tiny low-contrast control overlay
- no large title, card, shelf, or button panel

The portal is only a threshold. Do not add missions, collectible systems, or
large UI to the portal before the first game is playable.

## Visual Target

Low-poly motel horror with readable lighting, limited distance, simple geometry,
and intentionally rough presentation. The scene should feel cheap and
unsettling, not unfinished.

## References

- Puppet Combo: VHS/PS1 grime, strong silhouettes, harsh retro mood.
- Chilla's Art: mundane job spaces that become threatening through routine.
- Fears to Fathom: short grounded first-person scenarios.
- No Players Online: empty-space unease and old-game presentation.

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
