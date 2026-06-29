import { useEffect, useRef } from 'react';
import { GameShell } from '../components/GameShell';

export function OrbitCollector() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    let frame = 0;
    let animation = 0;

    function draw() {
      if (!context || !canvas) return;
      frame += 0.025;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#141824';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = '#62748f';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(180, 135, 74, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = '#f4d35e';
      context.beginPath();
      context.arc(180 + Math.cos(frame) * 74, 135 + Math.sin(frame) * 74, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#60d394';
      context.beginPath();
      context.arc(180 + Math.cos(frame * 0.7 + 2) * 48, 135 + Math.sin(frame * 0.7 + 2) * 48, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#e8eefc';
      context.font = '14px monospace';
      context.fillText('prototype timing loop', 18, 32);
      animation = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animation);
  }, []);

  return (
    <GameShell title="Orbit Collector">
      <canvas className="orbit-canvas" ref={canvasRef} width="360" height="270" />
      <p className="game-status">Canvas prototype. Timing rules pending.</p>
    </GameShell>
  );
}
