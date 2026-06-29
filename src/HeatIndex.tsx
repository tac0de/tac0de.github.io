import { PointerEvent, useRef } from 'react';

export function HeatIndex() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointRef = useRef({ x: 50, y: 50, heat: 0.4 });

  function warm(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      heat: event.buttons ? 1 : 0.66,
    };
    scheduleWrite();
  }

  function cool() {
    pointRef.current = { ...pointRef.current, heat: 0.4 };
    scheduleWrite();
  }

  function scheduleWrite() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const root = rootRef.current;
      if (!root) return;
      const { x, y, heat } = pointRef.current;
      root.style.setProperty('--x', `${x.toFixed(2)}%`);
      root.style.setProperty('--y', `${y.toFixed(2)}%`);
      root.style.setProperty('--heat', heat.toFixed(2));
    });
  }

  return (
    <main
      ref={rootRef}
      className="heat-index"
      onPointerDown={warm}
      onPointerMove={warm}
      onPointerUp={cool}
      onPointerCancel={cool}
      onPointerLeave={cool}
      aria-label="Heat Index, a touch-driven CSS artwork"
    >
      <div className="heat-map" aria-hidden="true">
        <span className="heat-cell heat-cell--a" />
        <span className="heat-cell heat-cell--b" />
        <span className="heat-cell heat-cell--c" />
      </div>
    </main>
  );
}
