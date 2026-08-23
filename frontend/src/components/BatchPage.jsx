import React, { useState } from 'react';
import { api } from '../api';

const BATCH_DEFAULTS = [
  { CreditScore:590, Geography:'Germany', Gender:'Female', Age:52, Tenure:1, Balance:125000, NumOfProducts:1, HasCrCard:1, IsActiveMember:0, EstimatedSalary:65000, 'Satisfaction Score':1, 'Point Earned':340, 'Card Type':'SILVER' },
  { CreditScore:760, Geography:'France', Gender:'Male', Age:28, Tenure:6, Balance:45000, NumOfProducts:2, HasCrCard:1, IsActiveMember:1, EstimatedSalary:110000, 'Satisfaction Score':5, 'Point Earned':820, 'Card Type':'DIAMOND' },
  { CreditScore:640, Geography:'Spain', Gender:'Male', Age:42, Tenure:4, Balance:98000, NumOfProducts:1, HasCrCard:0, IsActiveMember:1, EstimatedSalary:85000, 'Satisfaction Score':3, 'Point Earned':510, 'Card Type':'GOLD' },
  { CreditScore:680, Geography:'Germany', Gender:'Female', Age:46, Tenure:2, Balance:140000, NumOfProducts:3, HasCrCard:1, IsActiveMember:0, EstimatedSalary:92000, 'Satisfaction Score':2, 'Point Earned':610, 'Card Type':'PLATINUM' },
  { CreditScore:720, Geography:'France', Gender:'Male', Age:35, Tenure:5, Balance:0, NumOfProducts:2, HasCrCard:1, IsActiveMember:1, EstimatedSalary:75000, 'Satisfaction Score':4, 'Point Earned':455, 'Card Type':'GOLD' },
];

const RISK_SORT_ORDER = { 'Critical Risk': 0, 'High Risk': 1, 'Moderate Risk': 2, 'Low Risk': 3 };

export default function BatchPage() {
  const [results, setResults] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('probability');

  const handleRun = async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.predictBatch(BATCH_DEFAULTS);
      setResults(res.data.predictions);
      setSummary(res.data.summary);
    } catch (e) {
      setError(e?.response?.data?.message || 'Batch prediction failed. Is the Django server running?');
    } finally {
      setLoading(false);
    }
  };

  const sorted = results ? [...results].sort((a, b) => {
    if (sortBy === 'probability') return b.probability - a.probability;
    if (sortBy === 'risk')        return (RISK_SORT_ORDER[a.risk_level] ?? 99) - (RISK_SORT_ORDER[b.risk_level] ?? 99);
    return 0;
  }) : [];

  return (
    <div className="fade-in">
      <div className="page-title">📋 Batch Risk Analysis</div>
      <div className="page-sub">Analyze a portfolio of customers simultaneously to identify high-risk segments.</div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>Run Batch Analysis</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analyzes {BATCH_DEFAULTS.length} sample customers from different risk tiers</div>
          </div>
          <button className="btn btn-primary" onClick={handleRun} disabled={loading} style={{ minWidth: 160 }}>
            {loading ? <><div className="spinner" style={{ width:18, height:18, borderWidth:2 }} /> Running...</> : '🚀 Run Batch Predict'}
          </button>
        </div>
        {error && <div style={{ marginTop: 14, color: 'var(--rose)', fontSize: 13, padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 10 }}>{error}</div>}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Analyzed', value: summary.total_customers, color: 'indigo' },
            { label: 'Predicted Churners', value: summary.predicted_churners, color: 'rose' },
            { label: 'Predicted Retainers', value: summary.predicted_retainers, color: 'emerald' },
            { label: 'Churn Rate', value: `${summary.churn_rate_pct}%`, color: 'amber' },
          ].map(s => (
            <div key={s.label} className="stat-card fade-in">
              <div className={`stat-value text-${s.color}`}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Risk Distribution */}
      {results && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="section-title">Risk Distribution</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Critical Risk', 'High Risk', 'Moderate Risk', 'Low Risk'].map(level => {
              const count = results.filter(r => r.risk_level === level).length;
              const pct = Math.round((count / results.length) * 100);
              const color = { 'Critical Risk':'rose', 'High Risk':'orange', 'Moderate Risk':'amber', 'Low Risk':'emerald' }[level];
              return (
                <div key={level} style={{ flex: 1, padding: '12px 14px', background: 'var(--glass-bg)', border: `1px solid var(--glass-border)`, borderRadius: 12, textAlign: 'center' }}>
                  <div className={`stat-value text-${color}`} style={{ fontSize: 28 }}>{count}</div>
                  <div className="stat-label" style={{ marginTop: 4 }}>{level}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}% of batch</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Table */}
      {results && (
        <div className="card fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Prediction Results</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sort by:</span>
              <button className={`btn btn-sm ${sortBy === 'probability' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortBy('probability')}>Probability</button>
              <button className={`btn btn-sm ${sortBy === 'risk' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSortBy('risk')}>Risk Level</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {['#', 'Age', 'Geography', 'Balance', 'Products', 'Active', 'Card', 'Probability', 'Risk Level', 'Decision'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === '#' ? 'center' : 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.input.Age}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{r.input.Geography}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}>${(r.input.Balance || 0).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{r.input.NumOfProducts}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ color: r.input.IsActiveMember ? 'var(--emerald)' : 'var(--rose)', fontWeight: 700 }}>
                        {r.input.IsActiveMember ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)' }}>{r.input['Card Type']}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 5, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${r.probability_percentage}%`, background: { emerald:'var(--emerald)', amber:'var(--amber)', orange:'var(--orange)', rose:'var(--rose)' }[r.risk_color], borderRadius: 3 }} />
                        </div>
                        <span className="mono" style={{ fontWeight: 700, color: { emerald:'var(--emerald)', amber:'var(--amber)', orange:'var(--orange)', rose:'var(--rose)' }[r.risk_color], fontSize: 12 }}>
                          {r.probability_percentage}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`pill pill-${r.risk_color}`} style={{ fontSize: 10 }}>{r.risk_level}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`pill pill-${r.is_churn ? 'rose' : 'emerald'}`} style={{ fontSize: 10 }}>
                        {r.is_churn ? '⚠ CHURN' : '✓ RETAIN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!results && !loading && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div>Click <strong>Run Batch Predict</strong> to analyze the sample customer portfolio</div>
          </div>
        </div>
      )}
    </div>
  );
}
