import { Card } from '../components/Card';
import { games } from '../data/games';

const tones = ['violet', 'amber', 'cyan'] as const;

export function Games() {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <span>tiny web games gallery</span>
        <h1>Games</h1>
        <p>Lo-fi browser games with compact rules, short loops, and small-screen friendly layouts.</p>
      </section>
      <section className="card-grid">
        {games.map((game, index) => (
          <Card
            key={game.slug}
            title={game.title}
            description={game.description}
            tags={game.tags}
            status={game.status}
            to={`/games/${game.slug}`}
            tone={tones[index % tones.length]}
          />
        ))}
      </section>
    </div>
  );
}
