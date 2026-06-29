export type ExperimentStatus = 'live' | 'prototype' | 'specimen';

export type Experiment = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  status: ExperimentStatus;
  techniques: string[];
  featured?: boolean;
};

export const experiments: Experiment[] = [
  {
    slug: 'scroll-specimen-wall',
    title: 'Scroll Specimen Wall',
    description: 'A scroll-driven wall of CSS specimens using view timelines, depth, and progressive focus.',
    tags: ['scroll-timeline', 'view-timeline', '3d-css'],
    techniques: ['view-timeline', 'animation-range', 'perspective', 'scroll-snap', 'gradient noise'],
    status: 'live',
    featured: true,
  },
  {
    slug: 'sonar-interface',
    title: 'Sonar Interface',
    description: 'A CSS-only scanning interface made with conic gradients, masks, and registered custom properties.',
    tags: ['@property', 'conic-gradient', 'mask'],
    techniques: ['@property --angle', 'conic-gradient', 'radial-gradient', 'mask-image', 'clip-path'],
    status: 'live',
    featured: true,
  },
  {
    slug: 'morphing-type-poster',
    title: 'Morphing Type Poster',
    description: 'A kinetic typography poster that fractures and rebuilds through masks, blend modes, and variable motion.',
    tags: ['typography', 'clip-path', 'blend-mode'],
    techniques: ['clip-path', 'mix-blend-mode', 'text-shadow', 'mask gradients', 'hover choreography'],
    status: 'live',
    featured: true,
  },
  {
    slug: 'single-div-artifact',
    title: 'Single Div Artifact',
    description: 'A constrained CSS drawing made from one element, gradients, shadows, and pseudo-elements.',
    tags: ['single-div', 'gradient', 'css-art'],
    techniques: ['single element', 'pseudo-elements', 'box-shadow', 'filter', 'radial gradients'],
    status: 'live',
  },
  {
    slug: 'color-system-lab',
    title: 'Color System Lab',
    description: 'A live color field using oklch, color-mix, and CSS custom properties.',
    tags: ['oklch', 'color-mix', 'custom-properties'],
    techniques: ['oklch()', 'color-mix()', 'CSS variables', 'range input', '@property --hue'],
    status: 'live',
  },
  {
    slug: 'view-transition-gallery',
    title: 'View Transition Gallery',
    description: 'A card-to-artwork transition study using the View Transition API.',
    tags: ['view-transition', 'routing', 'motion'],
    techniques: ['document.startViewTransition', 'view-transition-name', 'route motion fallback'],
    status: 'prototype',
  },
  {
    slug: 'anchor-inspector',
    title: 'Anchor Inspector',
    description: 'A floating inspection panel attached to specimens using modern CSS positioning patterns.',
    tags: ['anchor', 'popover', 'interface'],
    techniques: ['@supports fallback', ':has()', 'absolute inspection panel', 'focus-visible states'],
    status: 'prototype',
  },
];

export function getExperiment(slug: string | undefined) {
  return experiments.find((experiment) => experiment.slug === slug);
}
