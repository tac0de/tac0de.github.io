import type { CSSProperties } from 'react';
import { Experiment } from '../data/experiments';

type ExperimentPreviewProps = {
  experiment: Experiment;
};

export function ExperimentPreview({ experiment }: ExperimentPreviewProps) {
  if (experiment.slug === 'signal-skin') return <SignalSkinDemo />;
  if (experiment.slug === 'specimen-wall') return <SpecimenWallDemo />;
  return <FractureTypeChamberDemo />;
}

function SignalSkinDemo() {
  return (
    <div className="demo-frame chamber-frame signal-skin-demo">
      <div className="living-membrane" aria-hidden="true">
        <span className="membrane-ring membrane-ring--one" />
        <span className="membrane-ring membrane-ring--two" />
        <span className="membrane-node membrane-node--a">pressure 0.68</span>
        <span className="membrane-node membrane-node--b">signal 142</span>
        <span className="membrane-node membrane-node--c">depth active</span>
        <div className="membrane-word">SKIN</div>
      </div>
    </div>
  );
}

function SpecimenWallDemo() {
  return (
    <div className="demo-frame chamber-frame specimen-wall-demo">
      <div className="wall-tunnel">
        {['signal', 'pressure', 'fracture', 'depth', 'mask'].map((label, index) => (
          <section className="wall-slab" key={label} style={{ '--slab': index } as CSSProperties}>
            <span>0{index + 1}</span>
            <strong>{label}</strong>
            <em>embedded specimen plate</em>
          </section>
        ))}
      </div>
    </div>
  );
}

function FractureTypeChamberDemo() {
  return (
    <div className="demo-frame chamber-frame fracture-type-demo">
      <div className="fracture-grid" aria-hidden="true" />
      <div className="fracture-word" data-word="TAC0DE">
        TAC0DE
      </div>
      <div className="fracture-readout">hover pressure / clip-path split / blend layer recomposition</div>
    </div>
  );
}
