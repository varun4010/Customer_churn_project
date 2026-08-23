import React, { useState } from 'react';
import DashboardPage  from './components/DashboardPage';
import PredictorPage  from './components/PredictorPage';
import WhatIfPage     from './components/WhatIfPage';
import BoundaryPage   from './components/BoundaryPage';
import BatchPage      from './components/BatchPage';
import './index.css';

const PAGES = [
  { id: 'dashboard',  label: 'Model Analytics',       icon: '📊' },
  { id: 'predictor',  label: 'Live Predictor',         icon: '🔮' },
  { id: 'whatif',     label: 'What-If Simulator',      icon: '🎛️' },
  { id: 'boundary',   label: 'Decision Boundary',      icon: '📐' },
  { id: 'batch',      label: 'Batch Analysis',         icon: '📋' },
];

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'predictor': return <PredictorPage />;
      case 'whatif':    return <WhatIfPage />;
      case 'boundary':  return <BoundaryPage />;
      case 'batch':     return <BatchPage />;
      default:          return <DashboardPage />;
    }
  };

  return (
    <div className="app-wrapper">
      <div className="bg-mesh" />

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">🏦</div>
          <div className="logo-title">ChurnSight AI</div>
          <div className="logo-sub">Bank Customer Analytics</div>
        </div>

        <div className="sidebar-nav">
          {PAGES.map(page => (
            <button
              key={page.id}
              className={`nav-item ${activePage === page.id ? 'active' : ''}`}
              onClick={() => setActivePage(page.id)}
            >
              <span className="nav-icon">{page.icon}</span>
              {page.label}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div>CatBoost + Django + React</div>
          <div className="model-badge">Model Ready</div>
          <div style={{ marginTop: 8, fontSize: 11 }}>
            Backend: <span style={{ color: 'var(--indigo-light)' }}>:8000</span>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="main-content" key={activePage}>
        {renderPage()}
      </main>
    </div>
  );
}
