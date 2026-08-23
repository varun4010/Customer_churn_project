import React, { useEffect, useRef } from 'react';

export default function DecisionBoundaryChart({ boundaryData }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!boundaryData || !boundaryData.grid || boundaryData.grid.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    const { grid, sample_points, x_range, y_range, tuned_threshold } = boundaryData;
    const [xMin, xMax] = x_range;
    const [yMin, yMax] = y_range;

    const toCanvasX = (age) => ((age - xMin) / (xMax - xMin)) * (W - 60) + 40;
    const toCanvasY = (bal) => H - 30 - ((bal - yMin) / (yMax - yMin)) * (H - 60);

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0b0f1f';
    ctx.fillRect(0, 0, W, H);

    // Determine grid resolution
    const ages  = [...new Set(grid.map(p => p.age))].sort((a,b)=>a-b);
    const bals  = [...new Set(grid.map(p => p.balance))].sort((a,b)=>a-b);
    const nX = ages.length, nY = bals.length;

    if (nX < 2 || nY < 2) return;

    const cellW = (W - 60) / (nX - 1);
    const cellH = (H - 60) / (nY - 1);

    // Draw probability heatmap cells
    const probMap = {};
    grid.forEach(p => { probMap[`${p.age}_${p.balance}`] = p.probability; });

    for (let xi = 0; xi < nX - 1; xi++) {
      for (let yi = 0; yi < nY - 1; yi++) {
        const prob = probMap[`${ages[xi]}_${bals[yi]}`] || 0;
        const cx   = toCanvasX(ages[xi]);
        const cy   = toCanvasY(bals[yi]);

        // Color: low prob = blue/indigo, high = red
        let r, g, b;
        if (prob < 0.5) {
          const t = prob * 2;
          r = Math.round(34  + t * (245 - 34));
          g = Math.round(211 + t * (158 - 211));
          b = Math.round(238 + t * (11 - 238));
        } else {
          const t = (prob - 0.5) * 2;
          r = Math.round(245 + t * (244 - 245));
          g = Math.round(158 + t * (63 - 158));
          b = Math.round(11  + t * (94 - 11));
        }
        ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
        ctx.fillRect(cx, cy - cellH, cellW, cellH);
      }
    }

    // Decision boundary line (threshold contour)
    const threshold = tuned_threshold || 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    let started = false;
    ages.forEach(age => {
      // Find approx balance where prob crosses threshold
      const pts = bals.map(bal => ({ bal, prob: probMap[`${age}_${bal}`] || 0 }));
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b2 = pts[i + 1];
        if ((a.prob - threshold) * (b2.prob - threshold) < 0) {
          const t = (threshold - a.prob) / (b2.prob - a.prob);
          const crossBal = a.bal + t * (b2.bal - a.bal);
          const px = toCanvasX(age), py = toCanvasY(crossBal);
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
          break;
        }
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Scatter points
    (sample_points || []).forEach(p => {
      const px = toCanvasX(p.age), py = toCanvasY(p.balance);
      ctx.beginPath();
      ctx.arc(px, py, p.exited ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle   = p.exited ? 'rgba(244,63,94,0.85)' : 'rgba(34,211,238,0.7)';
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth   = 0.8;
      ctx.fill();
      ctx.stroke();
    });

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(40, 10); ctx.lineTo(40, H - 30);
    ctx.moveTo(40, H - 30); ctx.lineTo(W - 10, H - 30);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Age', W / 2, H - 4);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Balance ($)', 0, 0);
    ctx.restore();

    // Tick labels
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '10px Inter';
    [20, 30, 40, 50, 60, 70, 80].forEach(age => {
      const px = toCanvasX(age);
      if (px > 40 && px < W - 10) {
        ctx.textAlign = 'center';
        ctx.fillText(age, px, H - 16);
      }
    });
    [0, 50000, 100000, 150000, 200000, 250000].forEach(bal => {
      const py = toCanvasY(bal);
      if (py > 10 && py < H - 30) {
        ctx.textAlign = 'right';
        ctx.fillText(bal >= 1000 ? `${(bal/1000).toFixed(0)}k` : bal, 36, py + 4);
      }
    });

    // Legend
    ctx.font = '600 11px Inter';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(34,211,238,0.9)'; ctx.beginPath(); ctx.arc(W-90, 18, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Retained', W-82, 22);
    ctx.fillStyle = 'rgba(244,63,94,0.9)'; ctx.beginPath(); ctx.arc(W-90, 36, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Churned', W-82, 40);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(W-100, 54); ctx.lineTo(W-70, 54); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8'; ctx.fillText('Threshold', W-68, 58);

  }, [boundaryData]);

  return (
    <div className="boundary-canvas" style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        width={680}
        height={360}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
}
