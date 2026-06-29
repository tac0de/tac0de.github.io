import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { experiments } from '../data/experiments';

export function Home() {
  return (
    <div className="page-stack living-home">
      <section className="title-screen living-field">
        <div className="signal-skin" aria-hidden="true">
          <span className="signal-ring signal-ring--one" />
          <span className="signal-ring signal-ring--two" />
          <span className="signal-ring signal-ring--three" />
          <span className="signal-thread signal-thread--a" />
          <span className="signal-thread signal-thread--b" />
          <span className="signal-thread signal-thread--c" />
          <span className="signal-core">tac0de</span>
        </div>
        <div className="living-readout" aria-label="Living field readout">
          <span>signal skin</span>
          <span>pressure field</span>
          <span>fracture chamber</span>
        </div>
      </section>

      <section className="field-strip living-art-strip" aria-label="Specimen states">
        {experiments.map((experiment, index) => (
          <Link
            className="field-node"
            key={experiment.slug}
            to={`/experiments/${experiment.slug}`}
            style={{ '--node': index } as CSSProperties}
          >
            <span>{experiment.status}</span>
            <strong>{experiment.title}</strong>
            <p>{experiment.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
