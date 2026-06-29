import { type ComponentType, type UIEvent, useRef } from 'react';
import { GlassWound } from './GlassWound';
import { HeatIndex } from './HeatIndex';
import { PressureBloom } from './PressureBloom';
import { SignalDrift } from './SignalDrift';
import { SoftCircuit } from './SoftCircuit';
import { TensionMesh } from './TensionMesh';

type ArtworkKey = 'pressure-bloom' | 'glass-wound' | 'signal-drift' | 'heat-index' | 'soft-circuit' | 'tension-mesh';

const artworkMap = {
  'pressure-bloom': {
    label: 'pressure bloom',
    Component: PressureBloom,
  },
  'glass-wound': {
    label: 'glass wound',
    Component: GlassWound,
  },
  'signal-drift': {
    label: 'signal drift',
    Component: SignalDrift,
  },
  'heat-index': {
    label: 'heat index',
    Component: HeatIndex,
  },
  'soft-circuit': {
    label: 'soft circuit',
    Component: SoftCircuit,
  },
  'tension-mesh': {
    label: 'tension mesh',
    Component: TensionMesh,
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
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const order = getSessionOrder();

  function updateFlow(event: UIEvent<HTMLElement>) {
    const target = event.currentTarget;
    if (frameRef.current) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const root = rootRef.current;
      if (!root) return;

      const max = Math.max(1, target.scrollHeight - target.clientHeight);
      const progress = target.scrollTop / max;
      root.style.setProperty('--scroll-flow', progress.toFixed(4));
      root.style.setProperty('--scroll-shift', `${(progress * 100).toFixed(2)}%`);
    });
  }

  return (
    <main
      ref={rootRef}
      className="living-scroll-gallery"
      onScroll={updateFlow}
      aria-label="tac0de living CSS artwork gallery"
    >
      <span className="gallery-atmosphere gallery-atmosphere--a" aria-hidden="true" />
      <span className="gallery-atmosphere gallery-atmosphere--b" aria-hidden="true" />
      <span className="gallery-mark">tac0de</span>
      {order.map((key, index) => {
        const { Component, label } = artworkMap[key];
        return (
          <section className="artwork-section" key={key} data-artwork={key} aria-label={label}>
            <Component />
            <span className="artwork-index">{String(index + 1).padStart(2, '0')} / {label}</span>
          </section>
        );
      })}
    </main>
  );
}
