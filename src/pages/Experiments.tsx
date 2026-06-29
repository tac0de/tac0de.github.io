import { Card } from '../components/Card';
import { experiments } from '../data/experiments';

const tones = ['cyan', 'violet', 'rose', 'amber', 'green'] as const;

export function Experiments() {
  return (
    <div className="page-stack">
      <section className="page-intro specimen-intro">
        <span>modern css specimen gallery</span>
        <h1>Specimen Wall</h1>
        <p>
          Scroll the wall. Hover a surface. The page should feel like CSS is the material, not a
          skin around content.
        </p>
      </section>
      <section className="card-grid specimen-wall">
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
