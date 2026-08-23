import React, { useEffect, useRef } from 'react';

export default function RiskGauge({ probability = 0.5, riskLevel = 'Moderate Risk', riskColor = 'amber' }) {
  const canvasRef = useRef(null);

  const colorMap = {
    emerald: '#10b981',
    amber:   '#f59e0b',
    orange:  '#f97316',
    rose:    '#f43f5e',
  };
  const color = colorMap[riskColor] || colorMap.amber;
  const pct = Math.round(probability * 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.72;
    const R = W * 0.38;
    const startA = Math.PI, endA = 2 * Math.PI;

    ctx.clearRect(0, 0, W, H);

    // Track background arc
    ctx.beginPath();
    ctx.arc(cx, cy, R, startA, endA);
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Colored arc gradient
    const gradColors = ['#10b981', '#f59e0b', '#f97316', '#f43f5e'];
    const grad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
    grad.addColorStop(0,    gradColors[0]);
    grad.addColorStop(0.33, gradColors[1]);
    grad.addColorStop(0.66, gradColors[2]);
    grad.addColorStop(1,    gradColors[3]);

    const fillEnd = startA + probability * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, R, startA, fillEnd);
    ctx.lineWidth = 22;
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Needle
    const needleA = startA + probability * Math.PI;
    const needleLen = R - 10;
    const nx = cx + needleLen * Math.cos(needleA);
    const ny = cy + needleLen * Math.sin(needleA);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#05070f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Min / Max labels
    ctx.font = '600 11px Inter';
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('0%', cx - R + 2, cy + 22);
    ctx.textAlign = 'right';
    ctx.fillText('100%', cx + R - 2, cy + 22);

  }, [probability, color]);

  return (
    <div className="gauge-container">
      <div className="gauge-svg-wrapper">
        <canvas ref={canvasRef} width={280} height={160} />
        <div className="gauge-label">
          <div className="gauge-pct" style={{ color }}>
            {pct}<span style={{ fontSize: 22, fontWeight: 600 }}>%</span>
          </div>
          <div className="gauge-risk" style={{ color }}>{riskLevel}</div>
        </div>
      </div>
    </div>
  );
}
