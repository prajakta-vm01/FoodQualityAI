import React from 'react';
import type { InspectionRecord } from '../types';
import { ArrowLeft, FileDown } from 'lucide-react';

interface DetailProps {
  record: InspectionRecord;
  onBack: () => void;
  apiBase: string;
}

export const InspectionDetail: React.FC<DetailProps> = ({ record, onBack, apiBase }) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn-cyber-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Audit History
        </button>
        <a 
          href={`${apiBase}/api/export/pdf/${record.inspection_id}`}
          target="_blank"
          rel="noreferrer"
          className="btn-cyber-primary"
        >
          <FileDown size={16} /> Download Certified Audit PDF
        </a>
      </div>

      <div className="grid-2">
        {/* Left Column: Image & Telemetry */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OPTICAL ARCHIVE & SAMPLE REFERENCE
            </span>
            <span className="badge-neon-cyan">{record.inspection_id}</span>
          </div>

          <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.5)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', border: '1px solid var(--border-subtle)' }}>
            <img 
              src={`${apiBase}${record.image_path}`} 
              alt={record.predicted_class}
              style={{ maxHeight: '280px', maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
              onError={(e: any) => { e.target.style.display = 'none'; }}
            />
          </div>

          <div className="grid-2" style={{ gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Timestamp</span>
              <span style={{ color: '#ffffff' }}>{new Date(record.timestamp).toLocaleString()}</span>
            </div>
            <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Produce Type</span>
              <strong style={{ textTransform: 'capitalize', color: 'var(--neon-cyan)' }}>{record.produce_category.replace('_', ' ')}</strong>
            </div>
            <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--border-subtle)', gridColumn: 'span 2' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Inspector Notes</span>
              <span style={{ color: 'var(--text-muted)' }}>{record.notes || 'None recorded'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Scoring & Inference Breakdown */}
        <div>
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                FOOD QUALITY & RISK VERDICT
              </span>
              <span className={record.condition === 'fresh' ? 'badge-neon-green' : 'badge-neon-red'}>
                {record.condition.toUpperCase()}
              </span>
            </div>

            {/* Quality Score */}
            <div style={{ background: 'rgba(5, 14, 20, 0.7)', border: '1px solid var(--border-subtle)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Aggregate Food Quality Score</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: record.food_quality_score >= 70 ? 'var(--neon-green)' : 'var(--neon-orange)' }}>
                {record.food_quality_score} <span style={{ fontSize: '1.1rem', color: 'var(--text-dim)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{record.grade}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Status: <strong style={{ color: 'var(--text-main)' }}>{record.status}</strong></div>
            </div>

            {/* Adulteration Risk Evaluation */}
            <div style={{ 
              background: record.adulteration_risk?.includes('HIGH') ? 'rgba(255, 51, 102, 0.12)' : record.adulteration_risk?.includes('MODERATE') ? 'rgba(255, 153, 0, 0.12)' : 'rgba(0, 255, 136, 0.08)',
              border: record.adulteration_risk?.includes('HIGH') ? '1px solid var(--neon-red)' : record.adulteration_risk?.includes('MODERATE') ? '1px solid var(--neon-orange)' : '1px solid var(--neon-green)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#ffffff' }}>CHEMICAL ADULTERATION ASSESSMENT</span>
                <span className={record.adulteration_risk?.includes('HIGH') ? 'badge-neon-red' : record.adulteration_risk?.includes('MODERATE') ? 'badge-neon-orange' : 'badge-neon-green'}>
                  {record.adulteration_risk || 'LOW / NORMAL'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {record.adulteration_details?.recommendation || 'Sensory parameters within normal bounds.'}
              </p>
            </div>

            {/* Vision Model Prediction */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                NEURAL NETWORK CLASSIFICATION
              </span>
              <div className="grid-2" style={{ gap: '0.5rem', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.65rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', display: 'block' }}>Predicted Fine Class</span>
                  <code style={{ color: 'var(--neon-cyan)' }}>{record.predicted_class}</code>
                </div>
                <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.65rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', display: 'block' }}>Confidence</span>
                  <strong style={{ color: '#ffffff' }}>{(record.confidence * 100).toFixed(1)}%</strong>
                </div>
              </div>
            </div>

            {/* Environmental Sensors */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neon-green)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                SENSOR TELEMETRY {record.is_sensor_simulated && <span className="badge-neon-orange" style={{ marginLeft: 6 }}>Simulated</span>}
              </span>
              <div className="grid-3" style={{ gap: '0.5rem' }}>
                <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.65rem', borderRadius: 4, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Gas (VOCs)</div>
                  <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>{record.gas_ppm ? `${record.gas_ppm} ppm` : 'N/A'}</strong>
                </div>
                <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.65rem', borderRadius: 4, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Humidity</div>
                  <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>{record.humidity_pct ? `${record.humidity_pct}%` : 'N/A'}</strong>
                </div>
                <div style={{ background: 'rgba(5, 14, 20, 0.6)', padding: '0.65rem', borderRadius: 4, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>pH Value</div>
                  <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>{record.ph_level ? record.ph_level : 'N/A'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
