import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ExperimentPreview } from '../components/ExperimentPreview';
import { Tag } from '../components/Tag';
import { getExperiment } from '../data/experiments';

export function ExperimentDetail() {
  const { slug } = useParams();
  const experiment = getExperiment(slug);

  if (!experiment) {
    return (
      <section className="page-intro">
        <h1>Experiment not found</h1>
        <Link className="button" to="/experiments">
          <ArrowLeft aria-hidden="true" size={17} />
          <span>Back to experiments</span>
        </Link>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="detail-heading">
        <Link className="back-link" to="/experiments">
          <ArrowLeft aria-hidden="true" size={17} />
          <span>Experiments</span>
        </Link>
        <span>{experiment.status}</span>
        <h1>{experiment.title}</h1>
        <p>{experiment.description}</p>
        <div className="tag-row">
          {experiment.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        <ul className="tech-list" aria-label="CSS techniques used">
          {experiment.techniques.map((technique) => (
            <li key={technique}>{technique}</li>
          ))}
        </ul>
      </section>
      <ExperimentPreview experiment={experiment} />
    </div>
  );
}
