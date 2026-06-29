import { archiveItems } from '../data/archive';

export function Archive() {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <span>experiment log</span>
        <h1>Archive</h1>
        <p>Short notes from the CSS specimen lab. No essays, no case studies, just trace marks.</p>
      </section>
      <ol className="archive-list">
        {archiveItems.map((item) => (
          <li key={`${item.date}-${item.title}`}>
            <span>{item.date}</span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
