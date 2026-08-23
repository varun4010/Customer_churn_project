import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DecisionBoundaryChart from './DecisionBoundaryChart';

export default function BoundaryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getDecisionBoundary()
      .then(res => setData(res.data.boundary))
      .catch(() => setError('Failed to load decision boundary data. Is the Django server running?'))
      .finally(() => setLoading(false));
  }, []);

  const churnPts   = data?.sample_points?.filter(p => p.exited === 1) || [];
  const retainPts  = data?.sample_points?.filter(p => p.exited === 0) || [];

  return (
    <div className="fade-in">
      <div className="page-title">📐 Decision Boundary</div>
      <div className="page-sub">
        2D visualization of the model's churn decision region across Age vs Account Balance.
        The dashed white line is the tuned threshold boundary.
      </div>

      {loading && <div className="card"><div className="loading-overlay"><div className="spinner" /><span>Loading boundary data...</span></div></div>}
      {error   && <div className="card"><div style={{ color: 'var(--rose)', padding: 20, textAlign: 'center' }}>{error}</div></div>}

      {data && !loading && (
        <>
          {/* Stats row */}
          <div className="grid-4" style={{ marginBottom: 20 }}>
            {[
              { label: 'Tuned Threshold', value: `${(data.tuned_threshold * 100).toFixed(1)}%`, color: 'indigo' },
              { label: 'Actual Churners', value: churnPts.length, color: 'rose' },
              { label: 'Actual Retained', value: retainPts.length, color: 'emerald' },
              { label: 'Grid Resolution', value: `${Math.round(Math.sqrt(data.grid.length))}×${Math.round(Math.sqrt(data.grid.length))}`, color: 'cyan' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className={`stat-value text-${s.color}`}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card card-glow">
            <div className="section-title" style={{ marginBottom: 16 }}>
              Age vs Balance — Churn Probability Heatmap
            </div>
            <DecisionBoundaryChart boundaryData={data} />
            <div className="divider" />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 40, height: 10, borderRadius: 3, background: 'linear-gradient(to right, #22d3ee, #f59e0b, #f43f5e)' }} />
                Probability gradient (low → high)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, borderTop: '2px dashed rgba(255,255,255,0.8)' }} />
                Tuned decision boundary (threshold = {(data.tuned_threshold*100).toFixed(1)}%)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(34,211,238,0.9)', border: '1px solid rgba(255,255,255,0.4)' }} />
                Retained customers
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(244,63,94,0.9)', border: '1px solid rgba(255,255,255,0.4)' }} />
                Churned customers
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="section-title">How to Read This Chart</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              {[
                { icon: '🔵', title: 'Blue/Cyan Region', desc: 'Low churn probability zone. Customers in this region are likely to stay.' },
                { icon: '🔴', title: 'Red Region', desc: 'High churn probability zone. Customers here are at significant risk of churning.' },
                { icon: '⚡', title: 'Dashed Boundary', desc: `The model's decision threshold at ${(data.tuned_threshold*100).toFixed(1)}%. Above = CHURN predicted.` },
              ].map(item => (
                <div key={item.title} className="factor-card" style={{ flexDirection: 'column' }}>
                  <div style={{ fontSize: 24 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
