import { Gamepad2, Grid3X3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { experiments } from '../data/experiments';
import { games } from '../data/games';

export function Home() {
  const featuredExperiments = experiments.filter((item) => item.featured).slice(0, 3);
  const featuredGames = games.filter((item) => item.featured).slice(0, 2);

  return (
    <div className="page-stack">
      <section className="title-screen">
        <div className="title-screen__signal">CSS experiments / tiny games / browser toys</div>
        <h1>tac0de</h1>
        <p>A small browser lab for visual CSS experiments, retro interfaces, and tiny web games.</p>
        <div className="hero-actions">
          <Link className="button button--primary" to="/experiments">
            <Grid3X3 aria-hidden="true" size={18} />
            <span>Enter Experiments</span>
          </Link>
          <Link className="button" to="/games">
            <Gamepad2 aria-hidden="true" size={18} />
            <span>Play Tiny Games</span>
          </Link>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span>featured experiments</span>
          <h2>Visual surfaces</h2>
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
          <span>featured tiny games</span>
          <h2>Playable toys</h2>
        </div>
        <div className="card-grid card-grid--two">
          {featuredGames.map((game, index) => (
            <Card
              key={game.slug}
              title={game.title}
              description={game.description}
              tags={game.tags}
              status={game.status}
              to={`/games/${game.slug}`}
              tone={index === 0 ? 'violet' : 'amber'}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
