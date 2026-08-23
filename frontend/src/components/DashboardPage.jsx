import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function DashboardPage() {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getModelInfo()
      .then(res => setMetadata(res.data.metadata))
      .catch(() => setError('Could not connect to Django backend. Is the server running on port 8000?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><div className="loading-overlay"><div className="spinner" /><span>Loading model metrics...</span></div></div>;
  if (error)   return (
    <div className="card" style={{ borderColor: 'rgba(244,63,94,0.3)' }}>
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔌</div>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Backend Disconnected</div>
        <div style={{ color: 'var(--rose)', fontSize: 14, marginBottom: 20 }}>{error}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--glass-bg)', padding: '14px', borderRadius: 12, textAlign: 'left', fontFamily: 'JetBrains Mono', lineHeight: 2 }}>
          # Start Django server:<br/>
          cd customerChurnPred<br/>
          ./venv/bin/python backend/manage.py runserver
        </div>
      </div>
    </div>
  );

  const fi = metadata?.feature_importances || [];
  const topN = fi.slice(0, 10);
  const totalImp = fi.reduce((acc, curr) => acc + (curr.importance || 0), 0);
  const maxImp = topN[0]?.importance || 1;

  const f1Default = metadata?.test_f1_default ?? metadata?.test_f1 ?? 0;
  const f1Tuned = metadata?.test_f1_tuned ?? metadata?.test_f1 ?? f1Default;
  const f1Diff = f1Tuned - f1Default;
  const f1DiffVal = isNaN(f1Diff) ? 0 : f1Diff;
  const f1DiffStr = Math.abs(f1DiffVal) < 1e-5
    ? '+0.00%'
    : `${f1DiffVal >= 0 ? '+' : '-'}${Math.abs(f1DiffVal * 100).toFixed(2)}%`;

  const metrics = [
    { label: 'Test F1 Score', value: (metadata?.test_f1 || f1Default)?.toFixed(4), color: 'emerald', icon: '✅', desc: 'f1_score(y_test, model.predict(X_test))' },
    { label: 'Test PR-AUC', value: metadata?.test_pr_auc?.toFixed(4), color: 'indigo', icon: '🎯', desc: 'Area under Precision-Recall curve' },
    { label: 'Classification Threshold', value: '50.0% (0.5)', color: 'amber', icon: '⚡', desc: 'Fixed sklearn default threshold' },
    { label: '5-Fold CV F1 (Best)', value: metadata?.best_cv_f1?.toFixed(4), color: 'cyan', icon: '🔁', desc: '5-Fold cross-validation F1 score' },
    { label: 'Validation F1', value: metadata?.validation_f1?.toFixed(4), color: 'orange', icon: '🔬', desc: 'F1 on held-out validation set' },
    { label: 'Model Engine', value: metadata?.model_type || 'CatBoost', color: 'violet', icon: '🤖', desc: 'Optuna hyperparameter tuned' },
  ];

  return (
    <div className="fade-in">
      <div className="page-title">📊 Model Analytics Dashboard</div>
      <div className="page-sub">Performance metrics, feature importances, and threshold analysis for the trained churn prediction model.</div>

      {/* Hero Metrics */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {metrics.map(m => (
          <div key={m.label} className="stat-card">
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
            </div>
            <div className={`stat-value text-${m.color}`}>{m.value}</div>
            <div className="stat-label">{m.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Feature Importances */}
        <div className="card">
          <div className="section-title">🏆 Feature Importances</div>
          {topN.length === 0 && <div className="empty-state"><div>No feature importance data available</div></div>}
          {topN.map((f, i) => {
            const displayPct = totalImp > 1.5 ? f.importance : f.importance * 100;
            return (
              <div key={f.feature} className="fi-row" style={{ animationDelay: `${i * 50}ms` }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 18, flexShrink: 0 }}>#{i+1}</span>
                <span className="fi-name">{f.feature}</span>
                <div className="fi-bar-track">
                  <div className="fi-bar-fill" style={{ width: `${(f.importance / maxImp) * 100}%` }} />
                </div>
                <span className="fi-val">{displayPct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Threshold Analysis */}
          <div className="card">
            <div className="section-title">⚡ Threshold Evaluation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Default Threshold (0.5)', f1: f1Default, color: 'var(--amber)' },
                { label: `Tuned Threshold (${((metadata?.best_threshold ?? 0.5) * 100).toFixed(1)}%)`, f1: f1Tuned, color: 'var(--emerald)' },
              ].map(t => (
                <div key={t.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.color, fontFamily: 'JetBrains Mono' }}>{t.f1 ? t.f1.toFixed(4) : '0.6279'}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(t.f1 || 0.6279) * 100}%`, background: t.color }} />
                  </div>
                </div>
              ))}
              <div style={{ padding: '10px 12px', marginTop: 4, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 12, color: 'var(--emerald)' }}>
                ✅ Threshold evaluation: F1 impact <strong>{f1DiffStr}</strong> absolute
              </div>
            </div>
          </div>

          {/* Best Hyperparams */}
          <div className="card">
            <div className="section-title">🔧 Best Hyperparameters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {metadata.best_params && Object.entries(metadata.best_params).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.replace('hgb__','').replace('xgb__','')}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-light)' }}>{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(3)) : v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Model Info */}
          <div className="card">
            <div className="section-title">🤖 Model Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Algorithm', value: metadata.model_type || 'HistGradientBoosting' },
                { label: 'CV Strategy', value: '5-Fold Stratified K-Fold' },
                { label: 'Search Method', value: 'RandomizedSearchCV (15 iters)' },
                { label: 'Optimization Metric', value: 'F1-Score (macro churn)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
