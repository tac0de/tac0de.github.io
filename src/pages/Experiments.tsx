import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { experiments } from '../data/experiments';

export function Experiments() {
  return (
    <div className="page-stack specimen-field-page">
      <section className="page-intro specimen-intro">
        <span>living specimen field</span>
        <h1>Field States</h1>
        <p>
          Three connected states of one CSS surface. The wall is not a gallery; it is the organism
          opening itself for inspection.
        </p>
      </section>
      <section className="living-specimen-wall">
        {experiments.map((experiment, index) => (
          <Link
            className="specimen-plate"
            key={experiment.slug}
            to={`/experiments/${experiment.slug}`}
            style={{ '--node': index } as CSSProperties}
          >
            <span>{experiment.status}</span>
            <h2>{experiment.title}</h2>
            <p>{experiment.description}</p>
            <div className="plate-tags">
              {experiment.tags.map((tag) => (
                <em key={tag}>{tag}</em>
              ))}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
