import { RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GameShell } from '../components/GameShell';

const anomalies = ['portrait', 'lamp', 'door', 'window'] as const;
type Anomaly = (typeof anomalies)[number];

export function GhostMotel() {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [reported, setReported] = useState('');
  const anomaly = useMemo<Anomaly>(() => anomalies[(round - 1) % anomalies.length], [round]);
  const active = clicks >= 3;

  function inspect(label: string) {
    setClicks((value) => value + 1);
    setReported(`checked ${label}`);
  }

  function report() {
    if (active) {
      setScore((value) => value + 1);
      setRound((value) => value + 1);
      setClicks(0);
      setReported('anomaly logged');
    } else {
      setMisses((value) => value + 1);
      setReported('no anomaly found');
    }
  }

  function reset() {
    setRound(1);
    setScore(0);
    setMisses(0);
    setClicks(0);
    setReported('');
  }

  return (
    <GameShell title="Ghost Motel">
      <div className="motel-hud">
        <span>round {round}</span>
        <span>score {score}</span>
        <span>miss {misses}</span>
      </div>
      <div className={`motel-room ${active ? `motel-room--${anomaly}` : ''}`}>
        <button className="room-object room-window" onClick={() => inspect('window')} aria-label="Inspect window" />
        <button className="room-object room-portrait" onClick={() => inspect('portrait')} aria-label="Inspect portrait" />
        <button className="room-object room-door" onClick={() => inspect('door')} aria-label="Inspect door" />
        <button className="room-object room-lamp" onClick={() => inspect('lamp')} aria-label="Inspect lamp" />
        <button className="room-object room-bed" onClick={() => inspect('bed')} aria-label="Inspect bed" />
        <div className="room-floor" />
      </div>
      <div className="game-controls">
        <button className="button button--primary" onClick={report}>
          Report Anomaly
        </button>
        <button className="icon-button" onClick={reset} aria-label="Restart Ghost Motel">
          <RotateCcw aria-hidden="true" size={18} />
        </button>
      </div>
      <p className="game-status">{reported || 'inspect the room, then report when something changes'}</p>
    </GameShell>
  );
}
