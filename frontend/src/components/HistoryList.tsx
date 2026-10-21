import React, { useState } from 'react';
import type { InspectionRecord } from '../types';
import { FileDown, Eye, RefreshCw } from 'lucide-react';

interface HistoryProps {
  inspections: InspectionRecord[];
  onSelectInspection: (record: InspectionRecord) => void;
  apiBase: string;
  onRefresh: () => void;
}

export const HistoryList: React.FC<HistoryProps> = ({ inspections, onSelectInspection, apiBase, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [conditionFilter, setConditionFilter] = useState('ALL');
  const [produceFilter, setProduceFilter] = useState('ALL');

  const filtered = inspections.filter(r => {
    const matchesSearch = r.inspection_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.produce_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.predicted_class.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCondition = conditionFilter === 'ALL' || r.condition.toUpperCase() === conditionFilter;
    const matchesProduce = produceFilter === 'ALL' || r.produce_category.toLowerCase() === produceFilter.toLowerCase();
    return matchesSearch && matchesCondition && matchesProduce;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>Audit Trail & Telemetry History</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Verified historical produce inspection records persisted in SQLite database</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-cyber-secondary" onClick={onRefresh}>
            <RefreshCw size={15} /> Refresh Stream
          </button>
          <a href={`${apiBase}/api/export/csv`} target="_blank" rel="noreferrer" className="btn-cyber-primary">
            <FileDown size={15} /> Export Complete CSV
          </a>
        </div>
      </div>

      {/* Filter Toolbar matching History Page in screenshot */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <input 
            type="text" 
            placeholder="Search by Sample ID, produce, or neural class..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="cyber-input"
          />
        </div>

        <div style={{ width: '180px' }}>
          <select value={conditionFilter} onChange={e => setConditionFilter(e.target.value)} className="cyber-input">
            <option value="ALL">All Conditions</option>
            <option value="FRESH">Fresh Produce</option>
            <option value="STALE">Stale / Defect</option>
          </select>
        </div>

        <div style={{ width: '180px' }}>
          <select value={produceFilter} onChange={e => setProduceFilter(e.target.value)} className="cyber-input">
            <option value="ALL">All Produce Types</option>
            <option value="apple">Apple</option>
            <option value="banana">Banana</option>
            <option value="bitter_gourd">Bitter Gourd</option>
            <option value="capsicum">Capsicum</option>
            <option value="orange">Orange</option>
            <option value="tomato">Tomato</option>
          </select>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            No inspection records match the selected filter criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Sample ID</th>
                  <th>Produce</th>
                  <th>Vision Condition</th>
                  <th>Confidence</th>
                  <th>Quality Score</th>
                  <th>Adulteration Risk</th>
                  <th>Sensor Mode</th>
                  <th>Certified Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.inspection_id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      {new Date(r.timestamp).toLocaleString()}
                    </td>
                    <td><code style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>{r.inspection_id}</code></td>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.produce_category.replace('_', ' ')}</td>
                    <td>
                      <span className={r.condition.toLowerCase() === 'fresh' ? 'badge-neon-green' : 'badge-neon-red'}>
                        {r.condition.toUpperCase()}
                      </span>
                    </td>
                    <td>{(r.confidence * 100).toFixed(1)}%</td>
                    <td><strong style={{ color: '#ffffff' }}>{r.food_quality_score}</strong> / 100</td>
                    <td>
                      <span className={r.adulteration_risk?.includes('HIGH') ? 'badge-neon-red' : r.adulteration_risk?.includes('MODERATE') ? 'badge-neon-orange' : 'badge-neon-green'}>
                        {r.adulteration_risk || 'LOW / NORMAL'}
                      </span>
                    </td>
                    <td>
                      <span className={r.is_sensor_simulated ? 'badge-neon-orange' : 'badge-neon-cyan'}>
                        {r.is_sensor_simulated ? 'Simulated' : 'Physical'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn-cyber-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => onSelectInspection(r)}>
                          <Eye size={12} /> View
                        </button>
                        <a 
                          href={`${apiBase}/api/export/pdf/${r.inspection_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-cyber-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <FileDown size={12} /> PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
