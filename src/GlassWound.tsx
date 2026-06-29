import { PointerEvent, useRef } from 'react';

export function GlassWound() {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const pointRef = useRef({ x: 50, y: 50, px: 43, py: 56, cut: 0.28 });

  function score(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const nextY = ((event.clientY - bounds.top) / bounds.height) * 100;
    pointRef.current = {
      x: nextX,
      y: nextY,
      px: pointRef.current.x,
      py: pointRef.current.y,
      cut: event.buttons ? 1 : 0.54,
    };
    scheduleWrite();
  }

  function close() {
    pointRef.current = {
      ...pointRef.current,
      cut: 0.24,
    };
    scheduleWrite();
  }

  function scheduleWrite() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = undefined;
      const root = rootRef.current;
      if (!root) return;
      const { x, y, px, py, cut } = pointRef.current;
      root.style.setProperty('--x', `${x.toFixed(2)}%`);
      root.style.setProperty('--y', `${y.toFixed(2)}%`);
      root.style.setProperty('--px', `${px.toFixed(2)}%`);
      root.style.setProperty('--py', `${py.toFixed(2)}%`);
      root.style.setProperty('--cut', cut.toFixed(2));
    });
  }

  return (
    <main
      ref={rootRef}
      className="glass-wound"
      onPointerDown={score}
      onPointerMove={score}
      onPointerUp={close}
      onPointerCancel={close}
      onPointerLeave={close}
      aria-label="Glass Wound, a touch-driven CSS artwork"
    >
      <div className="wound-pane" aria-hidden="true">
        <span className="wound-line wound-line--a" />
        <span className="wound-line wound-line--b" />
        <span className="wound-chip wound-chip--a" />
        <span className="wound-chip wound-chip--b" />
        <h1>surface remembers</h1>
      </div>
    </main>
  );
}
