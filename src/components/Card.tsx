import { ArrowUpRight } from 'lucide-react';
import type React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Tag } from './Tag';

type CardProps = {
  title: string;
  description: string;
  tags: string[];
  status: string;
  to: string;
  tone?: 'violet' | 'cyan' | 'amber' | 'green' | 'rose';
};

export function Card({ title, description, tags, status, to, tone = 'cyan' }: CardProps) {
  const navigate = useNavigate();

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };
    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => navigate(to));
      return;
    }
    navigate(to);
  }

  return (
    <Link className={`lab-card lab-card--${tone}`} to={to} onClick={onClick}>
      <div className="lab-card__topline">
        <span>{status}</span>
        <ArrowUpRight aria-hidden="true" size={18} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="tag-row">
        {tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
    </Link>
  );
}
