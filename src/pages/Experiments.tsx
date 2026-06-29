import { Card } from '../components/Card';
import { experiments } from '../data/experiments';

const tones = ['cyan', 'violet', 'rose', 'amber', 'green'] as const;

export function Experiments() {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <span>css art studies gallery</span>
        <h1>Experiments</h1>
        <p>
          Visual studies, interface fragments, and motion sketches built directly with CSS in the
          browser.
        </p>
      </section>
      <section className="card-grid">
        {experiments.map((experiment, index) => (
          <Card
            key={experiment.slug}
            title={experiment.title}
            description={experiment.description}
            tags={experiment.tags}
            status={experiment.status}
            to={`/experiments/${experiment.slug}`}
            tone={tones[index % tones.length]}
          />
        ))}
      </section>
    </div>
  );
}
