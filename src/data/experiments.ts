export type ExperimentStatus = 'live' | 'prototype' | 'sketch';

export type Experiment = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  status: ExperimentStatus;
  featured?: boolean;
};

export const experiments: Experiment[] = [
  {
    slug: 'crt-login-screen',
    title: 'CRT Login Screen',
    description: 'A retro access panel with scanlines, soft flicker, and terminal-like motion.',
    tags: ['css', 'crt', 'interface'],
    status: 'live',
    featured: true,
  },
  {
    slug: 'liquid-navigation',
    title: 'Liquid Navigation',
    description: 'A fluid hover navigation experiment using CSS transitions and layered shapes.',
    tags: ['css', 'motion', 'navigation'],
    status: 'sketch',
  },
  {
    slug: 'broken-typography-poster',
    title: 'Broken Typography Poster',
    description: 'A distorted type poster exploring split text, offset grids, and glitch rhythm.',
    tags: ['css', 'typography', 'glitch'],
    status: 'live',
    featured: true,
  },
  {
    slug: 'pixel-weather-card',
    title: 'Pixel Weather Card',
    description: 'A compact pixel-style information card with animated weather states.',
    tags: ['css', 'pixel', 'ui'],
    status: 'prototype',
  },
  {
    slug: 'ocean-scan-panel',
    title: 'Ocean Scan Panel',
    description: 'A scanning interface inspired by coastlines, sonar panels, and deep ocean maps.',
    tags: ['css', 'scan', 'interface'],
    status: 'live',
    featured: true,
  },
];

export function getExperiment(slug: string | undefined) {
  return experiments.find((experiment) => experiment.slug === slug);
}
