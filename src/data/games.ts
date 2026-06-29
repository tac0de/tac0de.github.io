export type GameStatus = 'playable' | 'prototype';

export type Game = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  status: GameStatus;
  featured?: boolean;
};

export const games: Game[] = [
  {
    slug: 'ghost-motel',
    title: 'Ghost Motel',
    description: 'A lo-fi anomaly hunting room where small changes reveal themselves over time.',
    tags: ['horror', 'click', 'lo-fi'],
    status: 'playable',
    featured: true,
  },
  {
    slug: 'typing-duel',
    title: 'Typing Duel',
    description: 'A small typing combat toy where words become attacks.',
    tags: ['typing', 'arcade', 'keyboard'],
    status: 'playable',
    featured: true,
  },
  {
    slug: 'orbit-collector',
    title: 'Orbit Collector',
    description: 'A one-screen timing game about collecting dots while orbiting a center point.',
    tags: ['canvas', 'timing', 'arcade'],
    status: 'prototype',
  },
];

export function getGame(slug: string | undefined) {
  return games.find((game) => game.slug === slug);
}
