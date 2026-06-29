import { Grid3X3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { experiments } from '../data/experiments';

export function Home() {
  const featuredExperiments = experiments.filter((item) => item.featured).slice(0, 3);
  const studyIndex = experiments.filter((item) => !item.featured);

  return (
    <div className="page-stack">
      <section className="title-screen">
        <div className="title-screen__signal">CSS art studies / interface rituals / browser-native surfaces</div>
        <h1>tac0de</h1>
        <p>
          A static room for experimental CSS surfaces, visual systems, and interface-shaped art.
          Browser-native studies arranged as small finished visual surfaces.
        </p>
        <div className="hero-actions">
          <Link className="button button--primary" to="/experiments">
            <Grid3X3 aria-hidden="true" size={18} />
            <span>Enter the Studies</span>
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span>featured css experiments</span>
          <h2>Visual studies</h2>
        </div>
        <div className="card-grid">
          {featuredExperiments.map((experiment, index) => (
            <Card
              key={experiment.slug}
              title={experiment.title}
              description={experiment.description}
              tags={experiment.tags}
              status={experiment.status}
              to={`/experiments/${experiment.slug}`}
              tone={['cyan', 'rose', 'green'][index] as 'cyan' | 'rose' | 'green'}
            />
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span>study index</span>
          <h2>Works in progress</h2>
        </div>
        <div className="card-grid card-grid--two">
          {studyIndex.map((experiment, index) => (
            <Card
              key={experiment.slug}
              title={experiment.title}
              description={experiment.description}
              tags={experiment.tags}
              status={experiment.status}
              to={`/experiments/${experiment.slug}`}
              tone={index === 0 ? 'violet' : 'amber'}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
