import { archiveItems } from '../data/archive';

export function Archive() {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <span>chronological experiment log</span>
        <h1>Archive</h1>
      </section>
      <ol className="archive-list">
        {archiveItems.map((item) => (
          <li key={item}>
            <span>{item.slice(0, 7)}</span>
            <p>{item.slice(10)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
