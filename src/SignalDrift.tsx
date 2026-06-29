import { PointerEvent, useRef } from 'react';

export function SignalDrift() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointRef = useRef({ x: 50, y: 50, drift: 0.34 });

  function tune(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      drift: event.buttons ? 1 : 0.58,
    };
    scheduleWrite();
  }

  function settle() {
    pointRef.current = { ...pointRef.current, drift: 0.34 };
    scheduleWrite();
  }

  function scheduleWrite() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const root = rootRef.current;
      if (!root) return;
      const { x, y, drift } = pointRef.current;
      root.style.setProperty('--x', `${x.toFixed(2)}%`);
      root.style.setProperty('--y', `${y.toFixed(2)}%`);
      root.style.setProperty('--drift', drift.toFixed(2));
    });
  }

  return (
    <main
      ref={rootRef}
      className="signal-drift"
      onPointerDown={tune}
      onPointerMove={tune}
      onPointerUp={settle}
      onPointerCancel={settle}
      onPointerLeave={settle}
      aria-label="Signal Drift, a touch-driven CSS artwork"
    >
      <div className="signal-field" aria-hidden="true">
        <span className="signal-band signal-band--a" />
        <span className="signal-band signal-band--b" />
        <span className="signal-band signal-band--c" />
      </div>
    </main>
  );
}
