export type GameStatus = "Playable" | "Prototype" | "Next";

export type GameEntry = {
  slug: string;
  title: string;
  status: GameStatus;
  route: string;
  description: string;
  tags: string[];
  tileClass: string;
  playable: boolean;
  demonstrates: string;
};

export const games: GameEntry[] = [
  {
    slug: "backrooms",
    title: "Backrooms Drift",
    status: "Playable",
    route: "./games/backrooms/",
    description: "Follow the hum, record echoes, escape lost time.",
    tags: ["Three.js", "WebAudio", "Procedural"],
    tileClass: "game-tile-live",
    playable: true,
    demonstrates: "Lo-fi 3D atmosphere, mobile controls, procedural rooms, signal-driven play."
  },
  {
    slug: "rpg",
    title: "Riftblade Arena",
    status: "Playable",
    route: "./games/rpg/",
    description: "Dash, cleave, and survive a compact dark-fantasy combat arena.",
    tags: ["Three.js", "Action RPG", "Combat"],
    tileClass: "game-tile-rpg",
    playable: true,
    demonstrates: "Quarter-view camera, click/touch movement, enemy waves, cooldown skills, hit feedback."
  }
];
