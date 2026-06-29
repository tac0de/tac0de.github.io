import { ReactNode } from 'react';

type GameShellProps = {
  title: string;
  children: ReactNode;
};

export function GameShell({ title, children }: GameShellProps) {
  return (
    <section className="game-shell" aria-label={title}>
      <div className="game-shell__screen">{children}</div>
    </section>
  );
}
