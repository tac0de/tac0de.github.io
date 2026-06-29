import { FlaskConical, Grid3X3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { experiments } from '../data/experiments';

export function Home() {
  const featuredExperiments = experiments.filter((item) => item.featured).slice(0, 3);
  const studyIndex = experiments.filter((item) => !item.featured);

  return (
    <div className="page-stack">
      <section className="title-screen">
        <div className="hero-specimen" aria-hidden="true">
          <div className="hero-orbit hero-orbit--one" />
          <div className="hero-orbit hero-orbit--two" />
          <div className="hero-mask-word">CSS</div>
        </div>
        <div className="title-screen__signal">Modern CSS Specimen Lab</div>
        <h1>tac0de</h1>
        <p>
          A browser-native lab for scroll timelines, masks, gradients, transitions, and visual
          interface experiments.
        </p>
        <div className="hero-actions">
          <Link className="button button--primary" to="/experiments">
            <FlaskConical aria-hidden="true" size={18} />
            <span>Enter the Lab</span>
          </Link>
          <Link className="button" to="/experiments">
            <Grid3X3 aria-hidden="true" size={18} />
            <span>View Specimens</span>
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span>featured css experiments</span>
          <h2>Specimen highlights</h2>
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
          <span>specimen index</span>
          <h2>Additional studies</h2>
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
