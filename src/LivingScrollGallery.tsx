import { type UIEvent, useRef } from 'react';
import { TensionMesh } from './TensionMesh';

const stages = ['loose', 'pulled', 'torn', 'repaired'];

export function LivingScrollGallery() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

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
      className="mesh-scroll-work"
      onScroll={updateFlow}
      aria-label="tac0de tension mesh living CSS artwork"
    >
      <span className="gallery-mark">tac0de</span>
      <section className="mesh-stage" aria-label="Tension Mesh">
        <TensionMesh />
      </section>
      <div className="mesh-scroll-rail" aria-hidden="true">
        {stages.map((stage) => (
          <span className={`mesh-stage-mark mesh-stage-mark--${stage}`} key={stage} />
        ))}
      </div>
    </main>
  );
}
