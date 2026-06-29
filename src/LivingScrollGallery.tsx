import type { ComponentType } from 'react';
import { GlassWound } from './GlassWound';
import { PressureBloom } from './PressureBloom';

type ArtworkKey = 'pressure-bloom' | 'glass-wound';

const artworkMap = {
  'pressure-bloom': {
    label: 'pressure bloom',
    Component: PressureBloom,
  },
  'glass-wound': {
    label: 'glass wound',
    Component: GlassWound,
  },
} satisfies Record<ArtworkKey, { label: string; Component: ComponentType }>;

const artworkKeys = Object.keys(artworkMap) as ArtworkKey[];

function getSessionOrder() {
  const stored = sessionStorage.getItem('tac0de_art_order');
  if (stored) {
    const parsed = stored.split(',').filter((key): key is ArtworkKey => artworkKeys.includes(key as ArtworkKey));
    if (parsed.length === artworkKeys.length) return parsed;
  }

  const shuffled = [...artworkKeys].sort(() => Math.random() - 0.5);
  sessionStorage.setItem('tac0de_art_order', shuffled.join(','));
  return shuffled;
}

export function LivingScrollGallery() {
  const order = getSessionOrder();

  return (
    <main className="living-scroll-gallery" aria-label="tac0de living CSS artwork gallery">
      <span className="gallery-mark">tac0de</span>
      {order.map((key, index) => {
        const { Component, label } = artworkMap[key];
        return (
          <section className="artwork-section" key={key} aria-label={label}>
            <Component />
            <span className="artwork-index">{String(index + 1).padStart(2, '0')} / {label}</span>
          </section>
        );
      })}
    </main>
  );
}
