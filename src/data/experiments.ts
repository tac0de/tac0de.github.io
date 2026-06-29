export type ExperimentStatus = 'core' | 'field' | 'chamber';

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
    slug: 'signal-skin',
    title: 'Signal Skin',
    description:
      'The living surface of tac0de: a shared CSS signal field made from registered properties, masks, gradients, and pressure states.',
    tags: ['@property', 'mask', 'oklch', 'conic-gradient'],
    techniques: ['@property --signal', '@property --pressure', 'mask-image', 'conic-gradient', 'oklch()'],
    status: 'core',
    featured: true,
  },
  {
    slug: 'specimen-wall',
    title: 'Specimen Wall',
    description:
      'A scan field where specimens behave like embedded plates inside the same interface organism.',
    tags: ['view-timeline', '3d-css', 'scroll-state', 'specimen-field'],
    techniques: ['view-timeline', 'animation-range', 'perspective', 'scroll-snap', 'blend modes'],
    status: 'field',
    featured: true,
  },
  {
    slug: 'fracture-type-chamber',
    title: 'Fracture Type Chamber',
    description:
      'An observation chamber where typography splits, compresses, and reassembles as a living CSS surface.',
    tags: ['clip-path', 'typography', 'mix-blend-mode', 'mask'],
    techniques: ['clip-path', 'text-shadow', 'mix-blend-mode', 'mask gradients', 'hover pressure'],
    status: 'chamber',
    featured: true,
  },
];

export function getExperiment(slug: string | undefined) {
  return experiments.find((experiment) => experiment.slug === slug);
}
