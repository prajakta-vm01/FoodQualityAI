import { useState, useEffect } from 'react';
import { LayoutDashboard, Cpu, Layers, History, ShieldCheck, Apple, Compass } from 'lucide-react';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { InspectImage } from './components/InspectImage';
import { BatchInspect } from './components/BatchInspect';
import { HistoryList } from './components/HistoryList';
import { InspectionDetail } from './components/InspectionDetail';
import type { DashboardStats, InspectionRecord, ModelStatus, ProduceCategories } from './types';

const API_BASE = 'http://localhost:8000';

export function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [currentRole, setCurrentRole] = useState<string>('all');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [categories, setCategories] = useState<ProduceCategories | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard-stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchInspections = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inspections?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setInspections(data);
      }
    } catch (e) {
      console.error('Error fetching inspections:', e);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catRes, modelRes] = await Promise.all([
        fetch(`${API_BASE}/api/produce-categories`),
        fetch(`${API_BASE}/api/model-status`)
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (modelRes.ok) setModelStatus(await modelRes.json());
    } catch (e) {
      console.error('Error fetching metadata:', e);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchStats();
    fetchInspections();
  }, []);

  const handleInspectionAdded = (newRec: InspectionRecord) => {
    setInspections(prev => [newRec, ...prev]);
    fetchStats();
  };

  const handleBatchAdded = (newRecords: InspectionRecord[]) => {
    setInspections(prev => [...newRecords, ...prev]);
    fetchStats();
  };

  const navigateTo = (view: string) => {
    setSelectedInspection(null);
    setCurrentView(view);
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation matching QualiScan reference layout */}
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigateTo('landing')} style={{ cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0, 240, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-cyan)', border: '1px solid var(--neon-cyan)' }}>
            <Apple size={20} />
          </div>
          <span>QUALISCAN AI</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => navigateTo('landing')}
          >
            <Compass size={18} /> Overview
          </button>
          <button 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigateTo('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            className={`nav-item ${currentView === 'inspect' ? 'active' : ''}`}
            onClick={() => navigateTo('inspect')}
          >
            <Cpu size={18} /> Inspect Page
          </button>
          <button 
            className={`nav-item ${currentView === 'batch' ? 'active' : ''}`}
            onClick={() => navigateTo('batch')}
          >
            <Layers size={18} /> Batch Stream
          </button>
          <button 
            className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => navigateTo('history')}
          >
            <History size={18} /> Audit History
          </button>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: modelStatus?.is_trained ? 'var(--neon-green)' : 'var(--neon-orange)', boxShadow: 'var(--neon-green-glow)' }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>
              {modelStatus?.is_trained ? 'MobileNetV2 ONLINE' : 'ENGINE STANDBY'}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>v2.4 Industrial Edition</div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="main-wrapper">
        <header className="top-bar">
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            FoodQualityAI / <span style={{ color: 'var(--neon-cyan)', textTransform: 'capitalize', fontWeight: 600 }}>{currentView}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge-neon-green" style={{ fontSize: '0.75rem' }}>
              <ShieldCheck size={12} style={{ marginRight: 4 }} /> 12 Classes Active
            </span>
            <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" className="btn-cyber-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
              REST API Docs
            </a>
          </div>
        </header>

        <main className="content-body">
          {selectedInspection ? (
            <InspectionDetail 
              record={selectedInspection} 
              onBack={() => setSelectedInspection(null)} 
              apiBase={API_BASE} 
            />
          ) : currentView === 'landing' ? (
            <LandingPage categories={categories} onNavigate={navigateTo} />
          ) : currentView === 'dashboard' ? (
            <Dashboard 
              stats={stats} 
              recentInspections={inspections} 
              onSelectInspection={(rec) => setSelectedInspection(rec)} 
              onNavigate={navigateTo} 
              currentRole={currentRole}
              onRoleChange={setCurrentRole}
            />
          ) : currentView === 'inspect' ? (
            <InspectImage 
              categories={categories} 
              onInspectionComplete={handleInspectionAdded} 
              apiBase={API_BASE} 
            />
          ) : currentView === 'batch' ? (
            <BatchInspect 
              apiBase={API_BASE} 
              onBatchComplete={handleBatchAdded} 
            />
          ) : currentView === 'history' ? (
            <HistoryList 
              inspections={inspections} 
              onSelectInspection={(rec) => setSelectedInspection(rec)} 
              apiBase={API_BASE} 
              onRefresh={() => { fetchInspections(); fetchStats(); }} 
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
