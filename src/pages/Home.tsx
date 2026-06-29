import { FlaskConical, Grid3X3 } from 'lucide-react';
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
          <span className="signal-thread signal-thread--a" />
          <span className="signal-thread signal-thread--b" />
          <span className="signal-core">CSS</span>
        </div>
        <div className="living-copy">
          <div className="title-screen__signal">Living Specimen Field</div>
          <h1>tac0de</h1>
          <p>
            A CSS organism for signal surfaces, pressure fields, and fractured interface specimens.
            The site is the artwork; each specimen is one state of the same living system.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary" to="/experiments">
              <FlaskConical aria-hidden="true" size={18} />
              <span>Enter the Field</span>
            </Link>
            <Link className="button" to="/experiments/specimen-wall">
              <Grid3X3 aria-hidden="true" size={18} />
              <span>Observe Specimens</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="field-strip" aria-label="Specimen states">
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
