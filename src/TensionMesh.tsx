import { PointerEvent, useRef } from 'react';

export function TensionMesh() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointRef = useRef({ x: 50, y: 50, pull: 0.28 });

  function pull(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointRef.current = {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      pull: event.buttons ? 1 : 0.58,
    };
    scheduleWrite();
  }

  function release() {
    pointRef.current = { ...pointRef.current, pull: 0.28 };
    scheduleWrite();
  }

  function scheduleWrite() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const root = rootRef.current;
      if (!root) return;
      const { x, y, pull } = pointRef.current;
      root.style.setProperty('--x', `${x.toFixed(2)}%`);
      root.style.setProperty('--y', `${y.toFixed(2)}%`);
      root.style.setProperty('--pull', pull.toFixed(2));
    });
  }

  return (
    <main
      ref={rootRef}
      className="tension-mesh"
      onPointerDown={pull}
      onPointerMove={pull}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      aria-label="Tension Mesh, a touch-driven CSS artwork"
    >
      <div className="mesh-field" aria-hidden="true">
        <span className="mesh-thread mesh-thread--a" />
        <span className="mesh-thread mesh-thread--b" />
        <span className="mesh-thread mesh-thread--c" />
        <span className="mesh-thread mesh-thread--d" />
        <span className="mesh-knot mesh-knot--a" />
        <span className="mesh-knot mesh-knot--b" />
        <span className="mesh-knot mesh-knot--c" />
      </div>
    </main>
  );
}
