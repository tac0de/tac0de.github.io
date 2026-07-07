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
    slug: "cards",
    title: "Card Camp",
    status: "Playable",
    route: "./games/cards/",
    description: "Feed a survivor, craft weapons, and clear threats on a 3D tabletop.",
    tags: ["Three.js", "Cards", "Simulation"],
    tileClass: "game-tile-cards",
    playable: true,
    demonstrates: "Three.js tabletop cards, mobile dragging, proximity crafting, survivor routines, threat escalation."
  }
];
