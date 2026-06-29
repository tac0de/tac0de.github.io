import { PointerEvent, useRef } from 'react';

export function PressureBloom() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointRef = useRef({ x: 50, y: 50, pressure: 0.42, bloom: 0.18 });

  function updatePressure(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      pressure: event.buttons ? 1 : 0.72,
      bloom: event.buttons ? 0.86 : 0.42,
    };
    scheduleWrite();
  }

  function releasePressure() {
    pointRef.current = {
      ...pointRef.current,
      pressure: 0.42,
      bloom: 0.18,
    };
    scheduleWrite();
  }

  function scheduleWrite() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const root = rootRef.current;
      if (!root) return;
      const { x, y, pressure, bloom } = pointRef.current;
      root.style.setProperty('--x', `${x.toFixed(2)}%`);
      root.style.setProperty('--y', `${y.toFixed(2)}%`);
      root.style.setProperty('--pressure', pressure.toFixed(2));
      root.style.setProperty('--bloom', bloom.toFixed(2));
    });
  }

  return (
    <main
      ref={rootRef}
      className="pressure-bloom"
      onPointerMove={updatePressure}
      onPointerDown={updatePressure}
      onPointerUp={releasePressure}
      onPointerCancel={releasePressure}
      onPointerLeave={releasePressure}
      aria-label="Pressure Bloom, a living CSS artwork"
    >
      <div className="bloom-surface" aria-hidden="true">
        <span className="bloom-vein bloom-vein--a" />
        <span className="bloom-vein bloom-vein--b" />
        <span className="bloom-rift bloom-rift--a" />
        <span className="bloom-petal bloom-petal--a" />
        <span className="bloom-petal bloom-petal--b" />
        <h1>tac0de</h1>
      </div>
    </main>
  );
}
