import { CSSProperties, PointerEvent, useState } from 'react';

type BloomStyle = CSSProperties & {
  '--x': string;
  '--y': string;
  '--pressure': number;
  '--bloom': number;
};

export function PressureBloom() {
  const [style, setStyle] = useState<BloomStyle>({
    '--x': '50%',
    '--y': '50%',
    '--pressure': 0.36,
    '--bloom': 0,
  });

  function updatePressure(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setStyle({
      '--x': `${x.toFixed(2)}%`,
      '--y': `${y.toFixed(2)}%`,
      '--pressure': 1,
      '--bloom': event.buttons ? 1 : 0.58,
    });
  }

  function releasePressure() {
    setStyle((current) => ({
      ...current,
      '--pressure': 0.38,
      '--bloom': 0,
    }));
  }

  return (
    <main
      className="pressure-bloom"
      style={style}
      onPointerMove={updatePressure}
      onPointerDown={updatePressure}
      onPointerUp={releasePressure}
      onPointerLeave={releasePressure}
      aria-label="Pressure Bloom, a living CSS artwork"
    >
      <div className="bloom-surface" aria-hidden="true">
        <span className="bloom-vein bloom-vein--a" />
        <span className="bloom-vein bloom-vein--b" />
        <span className="bloom-vein bloom-vein--c" />
        <span className="bloom-rift bloom-rift--a" />
        <span className="bloom-rift bloom-rift--b" />
        <span className="bloom-petal bloom-petal--a" />
        <span className="bloom-petal bloom-petal--b" />
        <span className="bloom-petal bloom-petal--c" />
        <h1>tac0de</h1>
      </div>
    </main>
  );
}
