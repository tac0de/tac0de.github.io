import { RotateCcw } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { GameShell } from '../components/GameShell';

const words = ['vector', 'signal', 'pixel', 'cursor', 'arcade', 'screen', 'syntax'];

export function TypingDuel() {
  const [enemyHp, setEnemyHp] = useState(40);
  const [playerHp, setPlayerHp] = useState(30);
  const [score, setScore] = useState(0);
  const [entry, setEntry] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem('tac0de_typing_best') || 0));
  const targetWord = useMemo(() => words[wordIndex % words.length], [wordIndex]);
  const gameOver = playerHp <= 0;

  useEffect(() => {
    if (gameOver) return undefined;
    const timer = window.setInterval(() => setPlayerHp((value) => Math.max(0, value - 1)), 1300);
    return () => window.clearInterval(timer);
  }, [gameOver]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem('tac0de_typing_best', String(score));
    }
  }, [best, score]);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.trim().toLowerCase();
    setEntry(value);
    if (value === targetWord) {
      const nextEnemyHp = enemyHp - 10;
      setScore((current) => current + 1);
      setEntry('');
      setWordIndex((index) => index + 1);
      if (nextEnemyHp <= 0) {
        setEnemyHp(40);
        setPlayerHp((hp) => Math.min(30, hp + 4));
      } else {
        setEnemyHp(nextEnemyHp);
      }
    }
  }

  function reset() {
    setEnemyHp(40);
    setPlayerHp(30);
    setScore(0);
    setEntry('');
    setWordIndex(0);
  }

  return (
    <GameShell title="Typing Duel">
      <div className="duel-stage">
        <div className="fighter fighter--player">
          <span>player</span>
          <strong>{playerHp} hp</strong>
        </div>
        <div className="duel-word">{targetWord}</div>
        <div className="fighter fighter--enemy">
          <span>enemy</span>
          <strong>{enemyHp} hp</strong>
        </div>
      </div>
      <div className="duel-input-row">
        <input
          value={entry}
          onChange={onChange}
          disabled={gameOver}
          spellCheck={false}
          autoCapitalize="off"
          aria-label="Type the attack word"
          placeholder={gameOver ? 'game over' : 'type attack word'}
        />
        <button className="icon-button" onClick={reset} aria-label="Restart Typing Duel">
          <RotateCcw aria-hidden="true" size={18} />
        </button>
      </div>
      <p className="game-status">
        score {score} / best {best}
        {gameOver ? ' / game over' : ''}
      </p>
    </GameShell>
  );
}
