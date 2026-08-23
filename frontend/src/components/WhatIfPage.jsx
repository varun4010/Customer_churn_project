import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';

const BASE_CUSTOMER = {
  CreditScore: 650, Geography: 'France', Gender: 'Male',
  Age: 42, Tenure: 3, Balance: 98000, NumOfProducts: 1,
  HasCrCard: 1, IsActiveMember: 0,
  EstimatedSalary: 85000, 'Satisfaction Score': 3, 'Point Earned': 500, 'Card Type': 'GOLD',
};

const FEATURES = [
  { key: 'Age',             label: 'Age',              min: 18,  max: 80,   step: 1,     format: v => `${v} yrs` },
  { key: 'Balance',         label: 'Account Balance',  min: 0,   max: 250000, step: 1000, format: v => `$${v.toLocaleString()}` },
  { key: 'CreditScore',     label: 'Credit Score',     min: 350, max: 850,  step: 5,     format: v => v },
  { key: 'EstimatedSalary', label: 'Estimated Salary', min: 10000, max: 200000, step: 1000, format: v => `$${v.toLocaleString()}` },
  { key: 'Tenure',          label: 'Tenure (years)',   min: 0,   max: 10,   step: 1,     format: v => `${v} yrs` },
  { key: 'NumOfProducts',   label: 'Num of Products',  min: 1,   max: 4,    step: 1,     format: v => v },
];

function MiniChart({ curve, threshold }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!curve || curve.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { t: 10, r: 10, b: 30, l: 46 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#111627';
    ctx.fillRect(0, 0, W, H);

    const probs = curve.map(p => p.probability);
    const vals  = curve.map(p => p.value);
    const minV  = Math.min(...vals), maxV = Math.max(...vals);
    const toX   = v => pad.l + ((v - minV) / (maxV - minV || 1)) * cW;
    const toY   = p => pad.t + (1 - p) * cH;

    // Grid lines
    [0, 0.25, 0.5, 0.75, 1].forEach(p => {
      const y = toY(p);
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = '10px Inter'; ctx.textAlign = 'right';
      ctx.fillText(`${(p * 100).toFixed(0)}%`, pad.l - 6, y + 4);
    });

    // Threshold line
    if (threshold) {
      const ty = toY(threshold);
      ctx.beginPath();
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(pad.l, ty); ctx.lineTo(W - pad.r, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 10px Inter'; ctx.textAlign = 'right';
      ctx.fillText(`threshold ${(threshold*100).toFixed(0)}%`, W - pad.r, ty - 4);
    }

    // Fill gradient
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0,   'rgba(244,63,94,0.4)');
    grad.addColorStop(0.5, 'rgba(245,158,11,0.2)');
    grad.addColorStop(1,   'rgba(34,211,238,0.05)');
    ctx.beginPath();
    ctx.moveTo(toX(vals[0]), toY(probs[0]));
    curve.forEach((p, i) => { if (i > 0) ctx.lineTo(toX(p.value), toY(p.probability)); });
    ctx.lineTo(toX(vals[vals.length-1]), H - pad.b);
    ctx.lineTo(toX(vals[0]), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    curve.forEach((p, i) => {
      const x = toX(p.value), y = toY(p.probability);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    const lineGrad = ctx.createLinearGradient(pad.l, 0, W - pad.r, 0);
    lineGrad.addColorStop(0,   '#22d3ee');
    lineGrad.addColorStop(0.5, '#f59e0b');
    lineGrad.addColorStop(1,   '#f43f5e');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // X-axis ticks
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '10px Inter'; ctx.textAlign = 'center';
    [vals[0], vals[Math.floor(vals.length/2)], vals[vals.length-1]].forEach(v => {
      ctx.fillText(v >= 1000 ? `${(v/1000).toFixed(0)}k` : v, toX(v), H - 8);
    });
  }, [curve, threshold]);

  return <canvas ref={canvasRef} width={520} height={200} style={{ width:'100%', height:'auto', display:'block', borderRadius: 10 }} />;
}

export default function WhatIfPage() {
  const [customer, setCustomer] = useState(BASE_CUSTOMER);
  const [activeFeature, setActiveFeature] = useState('Balance');
  const [curveData, setCurveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentProb, setCurrentProb] = useState(null);
  const [currentLoading, setCurrentLoading] = useState(false);

  const fetchCurve = useCallback(async (cust, feat) => {
    setLoading(true);
    try {
      const res = await api.whatIf(cust, feat);
      setCurveData(res.data.what_if);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCurrentProb = useCallback(async (cust) => {
    setCurrentLoading(true);
    try {
      const res = await api.predict(cust);
      setCurrentProb(res.data.prediction);
    } catch {}
    finally { setCurrentLoading(false); }
  }, []);

  useEffect(() => {
    fetchCurve(customer, activeFeature);
    fetchCurrentProb(customer);
  }, []);

  const handleFeatureChange = (feat) => {
    setActiveFeature(feat);
    fetchCurve(customer, feat);
  };

  const handleSliderChange = async (key, val) => {
    const next = { ...customer, [key]: val };
    setCustomer(next);
    fetchCurrentProb(next);
  };

  const handleAnalyze = () => {
    fetchCurve(customer, activeFeature);
  };

  const feat = FEATURES.find(f => f.key === activeFeature) || FEATURES[1];
  const threshold = curveData?.threshold;
  const curveAboveThreshold = curveData?.curve?.filter(p => p.is_churn).length || 0;
  const curveTotal = curveData?.curve?.length || 1;

  return (
    <div className="fade-in">
      <div className="page-title">🎛️ What-If Simulator</div>
      <div className="page-sub">Adjust customer attributes with sliders and see real-time impact on churn probability.</div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Left: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="section-title">Customer Sliders</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {FEATURES.map(f => (
                <div key={f.key} className="slider-wrapper">
                  <div className="slider-header">
                    <label className="form-label">{f.label}</label>
                    <span className="slider-val">{f.format(customer[f.key])}</span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={f.step}
                    value={customer[f.key]}
                    style={{ '--pct': `${((customer[f.key] - f.min) / (f.max - f.min)) * 100}%` }}
                    onChange={e => handleSliderChange(f.key, +e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Current Prediction */}
          {currentProb && (
            <div className="card fade-in" style={{ borderColor: { emerald:'rgba(16,185,129,0.3)', amber:'rgba(245,158,11,0.3)', orange:'rgba(249,115,22,0.3)', rose:'rgba(244,63,94,0.3)' }[currentProb.risk_color] }}>
              <div className="section-title">Current Customer Risk</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className={`stat-value text-${currentProb.risk_color}`} style={{ fontSize: 36 }}>
                    {currentProb.probability_percentage}%
                  </div>
                  <div className="stat-label">Churn Probability</div>
                </div>
                <span className={`pill pill-${currentProb.risk_color}`} style={{ fontSize: 13, padding: '8px 16px' }}>
                  {currentProb.risk_level}
                </span>
              </div>
              <div className="progress-bar" style={{ marginTop: 12 }}>
                <div className="progress-fill" style={{
                  width: `${currentProb.probability_percentage}%`,
                  background: { emerald:'var(--emerald)', amber:'var(--amber)', orange:'var(--orange)', rose:'var(--rose)' }[currentProb.risk_color]
                }} />
              </div>
            </div>
          )}
          {currentLoading && <div className="card"><div className="loading-overlay" style={{ padding: 16 }}><div className="spinner" style={{ width:24, height:24 }}/></div></div>}
        </div>

        {/* Right: Sensitivity Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="section-title">Sensitivity Analysis</div>
            <div style={{ marginBottom: 14 }}>
              <div className="form-label" style={{ marginBottom: 8 }}>Vary Feature:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {FEATURES.map(f => (
                  <button key={f.key}
                    className={`btn btn-sm ${activeFeature === f.key ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => handleFeatureChange(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost" style={{ marginBottom: 14, width: '100%' }} onClick={handleAnalyze}>
              🔄 Refresh Curve
            </button>

            {loading && <div className="loading-overlay" style={{ padding: 32 }}><div className="spinner" /><span>Computing sensitivity curve...</span></div>}
            {!loading && curveData && (
              <div className="fade-in">
                <MiniChart curve={curveData.curve} threshold={threshold} />
                <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10, flex: 1, textAlign: 'center' }}>
                    <div className="label">Varying</div>
                    <div style={{ fontWeight: 700, color: 'var(--indigo-light)', marginTop: 2 }}>{curveData.variable_feature}</div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10, flex: 1, textAlign: 'center' }}>
                    <div className="label">Churn Zone</div>
                    <div style={{ fontWeight: 700, color: 'var(--rose)', marginTop: 2 }}>
                      {Math.round((curveAboveThreshold / curveTotal) * 100)}% of range
                    </div>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, flex: 1, textAlign: 'center' }}>
                    <div className="label">Decision Threshold</div>
                    <div className="mono" style={{ fontWeight: 700, color: 'var(--indigo-light)', marginTop: 2 }}>
                      {threshold ? `${(threshold * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div style={{ marginTop: 16, maxHeight: 240, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)' }}>{feat.label}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>Probability</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {curveData.curve.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '5px 8px', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{feat.format(p.value)}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: p.is_churn ? 'var(--rose)' : 'var(--emerald)' }}>{p.probability_pct}%</td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                            <span className={`pill pill-${p.is_churn ? 'rose' : 'emerald'}`} style={{ fontSize: 10 }}>
                              {p.is_churn ? 'CHURN' : 'RETAIN'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {!loading && !curveData && (
              <div className="empty-state"><div className="empty-icon">📊</div><div>Select a feature to begin sensitivity analysis</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
