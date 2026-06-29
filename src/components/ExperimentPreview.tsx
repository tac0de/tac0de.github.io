import { CSSProperties, useState } from 'react';
import { Experiment } from '../data/experiments';

type ExperimentPreviewProps = {
  experiment: Experiment;
};

export function ExperimentPreview({ experiment }: ExperimentPreviewProps) {
  if (experiment.slug === 'scroll-specimen-wall') return <ScrollSpecimenWallDemo />;
  if (experiment.slug === 'sonar-interface') return <SonarInterfaceDemo />;
  if (experiment.slug === 'morphing-type-poster') return <MorphingTypePosterDemo />;
  if (experiment.slug === 'single-div-artifact') return <SingleDivArtifactDemo />;
  if (experiment.slug === 'color-system-lab') return <ColorSystemLabDemo />;
  if (experiment.slug === 'view-transition-gallery') return <ViewTransitionGalleryDemo />;
  return <AnchorInspectorDemo />;
}

function ScrollSpecimenWallDemo() {
  return (
    <div className="demo-frame scroll-specimen-demo">
      <div className="scroll-wall-stage">
        {['mask', 'depth', 'snap', 'glow', 'view', 'noise'].map((label, index) => (
          <article className="scroll-specimen-tile" key={label} style={{ '--i': index } as CSSProperties}>
            <span>0{index + 1}</span>
            <strong>{label}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}

function SonarInterfaceDemo() {
  return (
    <div className="demo-frame sonar-demo">
      <div className="sonar-specimen">
        <div className="sonar-sweep" />
        <div className="sonar-coast sonar-coast--a" />
        <div className="sonar-coast sonar-coast--b" />
        <div className="sonar-label sonar-label--a">node 04 / 34.12N</div>
        <div className="sonar-label sonar-label--b">depth -912m</div>
        <div className="sonar-label sonar-label--c">signal 78%</div>
      </div>
    </div>
  );
}

function MorphingTypePosterDemo() {
  return (
    <div className="demo-frame morph-type-demo">
      <div className="morph-poster-grid" />
      <div className="morph-word" data-word="SPECIMEN">
        SPECIMEN
      </div>
      <p>clip-path / masks / blend modes</p>
    </div>
  );
}

function SingleDivArtifactDemo() {
  return (
    <div className="demo-frame artifact-demo">
      <div className="single-artifact" aria-label="Single div CSS artifact" />
    </div>
  );
}

function ColorSystemLabDemo() {
  const [hue, setHue] = useState(210);
  return (
    <div className="demo-frame color-system-demo" style={{ '--hue': hue } as CSSProperties}>
      <div className="color-field">
        <div className="color-orb color-orb--surface" />
        <div className="color-orb color-orb--accent" />
        <div className="color-orb color-orb--danger" />
        <div className="color-readout">
          <span>base oklch(72% 0.18 {hue})</span>
          <strong>derived system</strong>
        </div>
      </div>
      <label className="hue-control">
        hue
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(event) => setHue(Number(event.target.value))}
        />
      </label>
    </div>
  );
}

function ViewTransitionGalleryDemo() {
  return (
    <div className="demo-frame transition-gallery-demo">
      {['one', 'two', 'three'].map((item) => (
        <div className={`transition-panel transition-panel--${item}`} key={item}>
          <span>{item}</span>
        </div>
      ))}
      <p>Route cards use View Transition API when supported.</p>
    </div>
  );
}

function AnchorInspectorDemo() {
  return (
    <div className="demo-frame anchor-demo">
      <div className="anchor-specimen">
        <button className="anchor-target">inspect surface</button>
        <aside className="anchor-panel">
          <span>attached panel</span>
          <strong>mask: radial</strong>
          <em>fallback: absolute</em>
        </aside>
      </div>
    </div>
  );
}
