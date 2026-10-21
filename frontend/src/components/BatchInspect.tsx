import { useState } from 'react';
import { Layers, FileDown, RefreshCw, AlertTriangle } from 'lucide-react';
import type { InspectionRecord } from '../types';

interface BatchProps {
  apiBase: string;
  onBatchComplete: (records: InspectionRecord[]) => void;
}

export const BatchInspect: React.FC<BatchProps> = ({ apiBase, onBatchComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [simulateSensors, setSimulateSensors] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<InspectionRecord[]>([]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (e.target.files.length > 50) {
        setErrorMsg('Maximum 50 files allowed per batch.');
        return;
      }
      setSelectedFiles(e.target.files);
      setErrorMsg(null);
    }
  };

  const handleRunBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      setErrorMsg('Please select one or more images.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }
    formData.append('simulate_sensors', simulateSensors ? 'true' : 'false');

    try {
      const response = await fetch(`${apiBase}/api/batch-inspect`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Batch inspection failed.');
      }

      const data = await response.json();
      setBatchResults(data.results);
      onBatchComplete(data.results);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing batch.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>Batch Inspection Stream</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Bulk automated produce grading, defect sorting, and adulteration risk profiling
        </p>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(255, 51, 102, 0.15)', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Batch Upload Form matching reference layout */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            BATCH INGESTION CONFIGURATION
          </span>
          <span className="badge-neon-cyan">MAX 50 SAMPLES / RUN</span>
        </div>

        <form onSubmit={handleRunBatch}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              SELECT BATCH PRODUCE PHOTOGRAPHS
            </label>
            <input type="file" multiple accept="image/*" onChange={handleFilesChange} className="cyber-input" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.4rem' }}>
              Selected: <strong style={{ color: 'var(--neon-cyan)' }}>{selectedFiles ? selectedFiles.length : 0}</strong> images queued for ingestion
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="checkbox" 
              id="batchSimulate" 
              checked={simulateSensors} 
              onChange={e => setSimulateSensors(e.target.checked)} 
            />
            <label htmlFor="batchSimulate" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer' }}>
              Enable Synchronized Multi-Sensor Telemetry Simulation (VOC Gas, Humidity, pH)
            </label>
          </div>

          <button type="submit" disabled={isLoading || !selectedFiles || selectedFiles.length === 0} className="btn-cyber-primary">
            {isLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Ingesting & Classifying Batch...
              </>
            ) : (
              <>
                <Layers size={18} /> Execute Batch Processing
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results Table matching Batch Page in screenshot */}
      {batchResults.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              BATCH ANALYSIS RESULTS ({batchResults.length} PROCESSED)
            </span>
            <a href={`${apiBase}/api/export/csv`} target="_blank" rel="noreferrer" className="btn-cyber-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              <FileDown size={14} /> Export CSV Ledger
            </a>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Batch Item ID</th>
                  <th>Optical Preview</th>
                  <th>Produce Category</th>
                  <th>Model Prediction</th>
                  <th>Condition</th>
                  <th>Confidence</th>
                  <th>Quality Score</th>
                  <th>Adulteration Risk</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map(r => (
                  <tr key={r.inspection_id}>
                    <td><code style={{ color: 'var(--neon-cyan)' }}>{r.inspection_id}</code></td>
                    <td>
                      <img src={`${apiBase}${r.image_path}`} alt="thumb" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
                    </td>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.produce_category.replace('_', ' ')}</td>
                    <td><code>{r.predicted_class}</code></td>
                    <td>
                      <span className={r.condition.toLowerCase() === 'fresh' ? 'badge-neon-green' : 'badge-neon-red'}>
                        {r.condition.toUpperCase()}
                      </span>
                    </td>
                    <td>{(r.confidence * 100).toFixed(1)}%</td>
                    <td><strong>{r.food_quality_score}</strong> / 100</td>
                    <td>
                      <span className={r.adulteration_risk?.includes('HIGH') ? 'badge-neon-red' : r.adulteration_risk?.includes('MODERATE') ? 'badge-neon-orange' : 'badge-neon-green'}>
                        {r.adulteration_risk || 'LOW / NORMAL'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
