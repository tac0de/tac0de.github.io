import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Tag } from '../components/Tag';
import { GhostMotel } from '../games/GhostMotel';
import { OrbitCollector } from '../games/OrbitCollector';
import { TypingDuel } from '../games/TypingDuel';
import { getGame } from '../data/games';

export function GameDetail() {
  const { slug } = useParams();
  const game = getGame(slug);

  if (!game) {
    return (
      <section className="page-intro">
        <h1>Game not found</h1>
        <Link className="button" to="/games">
          <ArrowLeft aria-hidden="true" size={17} />
          <span>Back to games</span>
        </Link>
      </section>
    );
  }

  return (
    <div className="page-stack">
      <section className="detail-heading">
        <Link className="back-link" to="/games">
          <ArrowLeft aria-hidden="true" size={17} />
          <span>Games</span>
        </Link>
        <span>{game.status}</span>
        <h1>{game.title}</h1>
        <p>{game.description}</p>
        <div className="tag-row">
          {game.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </section>
      {game.slug === 'ghost-motel' && <GhostMotel />}
      {game.slug === 'typing-duel' && <TypingDuel />}
      {game.slug === 'orbit-collector' && <OrbitCollector />}
    </div>
  );
}
