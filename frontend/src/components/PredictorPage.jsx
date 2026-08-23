import React, { useState, useCallback } from 'react';
import { api } from '../api';
import RiskGauge from './RiskGauge';

const INITIAL_FORM = {
  CreditScore: 650,
  Geography: 'France',
  Gender: 'Male',
  Age: 40,
  Tenure: 3,
  Balance: 60000,
  NumOfProducts: 2,
  HasCrCard: 1,
  IsActiveMember: 1,
  EstimatedSalary: 100000,
  'Satisfaction Score': 3,
  'Point Earned': 500,
  'Card Type': 'DIAMOND',
};

const PRESETS = [
  {
    name: '⚠️ High Risk (Sarah)',
    desc: 'Older, inactive, single product',
    data: { CreditScore:590, Geography:'Germany', Gender:'Female', Age:52, Tenure:1, Balance:125000, NumOfProducts:1, HasCrCard:1, IsActiveMember:0, EstimatedSalary:65000, 'Satisfaction Score':1, 'Point Earned':340, 'Card Type':'SILVER' }
  },
  {
    name: '✅ Low Risk (Alex)',
    desc: 'Young, active, multi-product',
    data: { CreditScore:760, Geography:'France', Gender:'Male', Age:28, Tenure:6, Balance:45000, NumOfProducts:2, HasCrCard:1, IsActiveMember:1, EstimatedSalary:110000, 'Satisfaction Score':5, 'Point Earned':820, 'Card Type':'DIAMOND' }
  },
  {
    name: '🔶 Moderate (Marcus)',
    desc: 'Mid-age, active, 1 product',
    data: { CreditScore:640, Geography:'Spain', Gender:'Male', Age:42, Tenure:4, Balance:98000, NumOfProducts:1, HasCrCard:0, IsActiveMember:1, EstimatedSalary:85000, 'Satisfaction Score':3, 'Point Earned':510, 'Card Type':'GOLD' }
  },
  {
    name: '🚨 Critical (Elena)',
    desc: '3+ products, inactive, high balance',
    data: { CreditScore:680, Geography:'Germany', Gender:'Female', Age:46, Tenure:2, Balance:140000, NumOfProducts:3, HasCrCard:1, IsActiveMember:0, EstimatedSalary:92000, 'Satisfaction Score':2, 'Point Earned':610, 'Card Type':'PLATINUM' }
  },
];

export default function PredictorPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handlePreset = (preset) => {
    setForm({ ...INITIAL_FORM, ...preset.data });
    setResult(null);
  };

  const handleSubmit = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.predict(form);
      const payload = res.data.prediction || res.data;
      setResult(payload);
    } catch (e) {
      console.error('Prediction API Error:', e);
      setError(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (e?.response?.data?.errors ? JSON.stringify(e.response.data.errors) : 'Prediction failed. Is the Django server running?')
      );
    } finally {
      setLoading(false);
    }
  }, [form]);

  const riskBorder = result ? {
    emerald: 'rgba(16,185,129,0.3)',
    amber:   'rgba(245,158,11,0.3)',
    orange:  'rgba(249,115,22,0.3)',
    rose:    'rgba(244,63,94,0.3)',
  }[result.risk_color] || 'var(--glass-border)' : 'var(--glass-border)';

  return (
    <div className="fade-in">
      <div className="page-title">🔮 Live Churn Risk Predictor</div>
      <div className="page-sub">Enter customer attributes to get an instant churn probability with AI-powered risk insights.</div>

      {/* Quick Presets */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Quick Load Preset Customer</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {PRESETS.map(p => (
            <button key={p.name} className="preset-btn" onClick={() => handlePreset(p)}>
              <span className="preset-name">{p.name}</span>
              <span className="preset-desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* INPUT FORM */}
        <div className="card">
          <div className="section-title">Customer Profile</div>

          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Credit Score</label>
              <input className="form-input" type="number" min="300" max="900"
                value={form.CreditScore} onChange={e => handleChange('CreditScore', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input className="form-input" type="number" min="18" max="100"
                value={form.Age} onChange={e => handleChange('Age', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Geography</label>
              <select className="form-select" value={form.Geography} onChange={e => handleChange('Geography', e.target.value)}>
                <option>France</option><option>Germany</option><option>Spain</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={form.Gender} onChange={e => handleChange('Gender', e.target.value)}>
                <option>Male</option><option>Female</option>
              </select>
            </div>
          </div>

          {/* Balance Slider */}
          <div className="slider-wrapper" style={{ marginBottom: 14 }}>
            <div className="slider-header">
              <label className="form-label">Account Balance</label>
              <span className="slider-val">${form.Balance.toLocaleString()}</span>
            </div>
            <input type="range" min="0" max="250000" step="1000"
              value={form.Balance}
              style={{ '--pct': `${(form.Balance / 250000) * 100}%` }}
              onChange={e => handleChange('Balance', +e.target.value)} />
          </div>

          {/* Salary Slider */}
          <div className="slider-wrapper" style={{ marginBottom: 14 }}>
            <div className="slider-header">
              <label className="form-label">Estimated Salary</label>
              <span className="slider-val">${form.EstimatedSalary.toLocaleString()}</span>
            </div>
            <input type="range" min="10000" max="200000" step="1000"
              value={form.EstimatedSalary}
              style={{ '--pct': `${((form.EstimatedSalary - 10000) / 190000) * 100}%` }}
              onChange={e => handleChange('EstimatedSalary', +e.target.value)} />
          </div>

          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Tenure (years)</label>
              <input className="form-input" type="number" min="0" max="10"
                value={form.Tenure} onChange={e => handleChange('Tenure', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Num of Products</label>
              <select className="form-select" value={form.NumOfProducts} onChange={e => handleChange('NumOfProducts', +e.target.value)}>
                <option value={1}>1</option><option value={2}>2</option>
                <option value={3}>3</option><option value={4}>4</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Points Earned</label>
              <input className="form-input" type="number" min="0" max="1000"
                value={form['Point Earned']} onChange={e => handleChange('Point Earned', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Card Type</label>
              <select className="form-select" value={form['Card Type']} onChange={e => handleChange('Card Type', e.target.value)}>
                <option>SILVER</option><option>GOLD</option>
                <option>PLATINUM</option><option>DIAMOND</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <div className="toggle-wrapper">
              <div className={`toggle ${form.HasCrCard ? 'on' : ''}`} onClick={() => handleChange('HasCrCard', form.HasCrCard ? 0 : 1)}>
                <div className="toggle-dot" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Has Credit Card</span>
            </div>
            <div className="toggle-wrapper">
              <div className={`toggle ${form.IsActiveMember ? 'on' : ''}`} onClick={() => handleChange('IsActiveMember', form.IsActiveMember ? 0 : 1)}>
                <div className="toggle-dot" />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Active Member</span>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleSubmit} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Predicting...</> : '🧠 Predict Churn Risk'}
          </button>
          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, fontSize: 13, color: 'var(--rose)' }}>{error}</div>}
        </div>

        {/* RESULTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!result && !loading && (
            <div className="card" style={{ flex: 1 }}>
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <div>Fill out the customer profile and click <strong>Predict Churn Risk</strong></div>
                <div style={{ fontSize: 12 }}>Or load a preset customer to see a demo</div>
              </div>
            </div>
          )}
          {loading && (
            <div className="card" style={{ flex: 1 }}>
              <div className="loading-overlay"><div className="spinner" /><span>Analyzing customer profile...</span></div>
            </div>
          )}
          {result && !loading && (
            <>
              {/* Gauge + Risk */}
              <div className="card card-glow fade-in" style={{ borderColor: riskBorder }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>Risk Assessment</div>
                  <span className={`pill pill-${result.risk_color}`}>{result.prediction_label}</span>
                </div>
                <RiskGauge probability={result.probability} riskLevel={result.risk_level} riskColor={result.risk_color} />
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  {[
                    { label: 'Probability', value: `${result.probability_percentage}%`, color: result.risk_color },
                    { label: 'Threshold', value: `${(result.threshold * 100).toFixed(1)}%`, color: 'indigo' },
                    { label: 'Decision', value: result.is_churn ? 'CHURN' : 'RETAIN', color: result.is_churn ? 'rose' : 'emerald' },
                  ].map(s => (
                    <div key={s.label}>
                      <div className={`stat-value text-${s.color}`} style={{ fontSize: 22 }}>{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Factors */}
              {result.factors?.length > 0 && (
                <div className="card fade-in">
                  <div className="section-title">Risk Factor Analysis</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.factors.map((f, i) => (
                      <div key={i} className="factor-card">
                        <div className={`factor-icon factor-icon-${f.type}`}>
                          {f.type === 'risk' ? '⚠️' : '✅'}
                        </div>
                        <div>
                          <div className="factor-text">{f.factor}</div>
                          <div className="factor-impact">{f.impact}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="card fade-in">
                  <div className="section-title">💡 Retention Recommendations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.recommendations.map((r, i) => (
                      <div key={i} className="rec-item">
                        <span className="rec-num">{i + 1}.</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engineered Features */}
              <div className="card fade-in">
                <div className="section-title">🔧 Engineered Feature Values</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {result.engineered_features && Object.entries(result.engineered_features).map(([k, v]) => (
                    <div key={k} style={{ padding: '10px 12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 10 }}>
                      <div className="label" style={{ marginBottom: 4 }}>{k}</div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--indigo-light)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
