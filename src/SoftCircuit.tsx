import { PointerEvent, useRef } from 'react';

export function SoftCircuit() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointRef = useRef({ x: 50, y: 50, pulse: 0.32 });

  function route(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      pulse: event.buttons ? 1 : 0.56,
    };
    scheduleWrite();
  }

  function idle() {
    pointRef.current = { ...pointRef.current, pulse: 0.32 };
    scheduleWrite();
  }

  function scheduleWrite() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const root = rootRef.current;
      if (!root) return;
      const { x, y, pulse } = pointRef.current;
      root.style.setProperty('--x', `${x.toFixed(2)}%`);
      root.style.setProperty('--y', `${y.toFixed(2)}%`);
      root.style.setProperty('--pulse', pulse.toFixed(2));
    });
  }

  return (
    <main
      ref={rootRef}
      className="soft-circuit"
      onPointerDown={route}
      onPointerMove={route}
      onPointerUp={idle}
      onPointerCancel={idle}
      onPointerLeave={idle}
      aria-label="Soft Circuit, a touch-driven CSS artwork"
    >
      <div className="circuit-skin" aria-hidden="true">
        <span className="circuit-node circuit-node--a" />
        <span className="circuit-node circuit-node--b" />
        <span className="circuit-node circuit-node--c" />
        <h1>soft circuit</h1>
      </div>
    </main>
  );
}
