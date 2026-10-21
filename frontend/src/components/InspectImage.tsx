
import React, { useEffect, useState } from 'react';
import {
  Cpu,
  AlertTriangle,
  FileDown,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { InspectionRecord, ProduceCategories } from '../types';

interface InspectProps {
  categories: ProduceCategories | null;
  onInspectionComplete: (record: InspectionRecord) => void;
  apiBase: string;
}

export const InspectImage: React.FC<InspectProps> = ({
  categories,
  onInspectionComplete,
  apiBase,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [produceCategory, setProduceCategory] = useState<string>('');
  const [simulateSensors, setSimulateSensors] = useState<boolean>(true);
  const [gasPpm, setGasPpm] = useState<string>('');
  const [humidityPct, setHumidityPct] = useState<string>('');
  const [phLevel, setPhLevel] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<InspectionRecord | null>(null);

  // Create and clean up the image preview URL.
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG).');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setErrorMsg(null);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setProduceCategory('');
    setSimulateSensors(true);
    setGasPpm('');
    setHumidityPct('');
    setPhLevel('');
    setResult(null);
    setErrorMsg(null);
  };

  const handleRunInspection = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!selectedFile) {
      setErrorMsg('Please select an image before executing inspection.');
      return;
    }

    if (!simulateSensors) {
      const sensorValues = [
        { name: 'Gas VOC', value: gasPpm },
        { name: 'Humidity', value: humidityPct },
        { name: 'pH', value: phLevel },
      ];

      for (const sensor of sensorValues) {
        if (
          sensor.value.trim() === '' ||
          !Number.isFinite(Number(sensor.value))
        ) {
          setErrorMsg(`Please enter a valid numeric value for ${sensor.name}.`);
          return;
        }
      }

      if (Number(gasPpm) < 0) {
        setErrorMsg('Gas VOC cannot be negative.');
        return;
      }

      if (Number(humidityPct) < 0 || Number(humidityPct) > 100) {
        setErrorMsg('Humidity must be between 0 and 100.');
        return;
      }

      if (Number(phLevel) < 0 || Number(phLevel) > 14) {
        setErrorMsg('pH must be between 0 and 14.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    if (produceCategory) {
      formData.append('produce_category', produceCategory);
    }

    formData.append(
      'simulate_sensors',
      simulateSensors ? 'true' : 'false'
    );

    if (!simulateSensors) {
      formData.append('gas_ppm', gasPpm);
      formData.append('humidity_pct', humidityPct);
      formData.append('ph_level', phLevel);
    }

    try {
      const baseUrl = apiBase.replace(/\/+$/, '');

      const response = await fetch(`${baseUrl}/api/inspect`, {
        method: 'POST',
        body: formData,
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        let message = 'Inspection failed on server.';

        if (data && typeof data === 'object' && 'detail' in data) {
          const detail = data.detail;

          if (typeof detail === 'string') {
            message = detail;
          } else if (Array.isArray(detail)) {
            message = detail
              .map((item) =>
                item &&
                typeof item === 'object' &&
                'msg' in item
                  ? String(item.msg)
                  : String(item)
              )
              .join(', ');
          }
        }

        throw new Error(message);
      }

      if (
        !data ||
        typeof data !== 'object' ||
        !('record' in data) ||
        !data.record ||
        typeof data.record !== 'object'
      ) {
        throw new Error(
          'The server response is missing the inspection record.'
        );
      }

      const record = data.record as InspectionRecord;

      setResult(record);
      onInspectionComplete(record);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Network or server error. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize optional result fields to avoid runtime crashes.
  const condition = String(result?.condition ?? 'UNKNOWN');
  const normalizedCondition = condition.toLowerCase();
  const isFresh = normalizedCondition === 'fresh';

  const riskLevel = String(
    result?.adulteration_details?.risk_level ?? 'LOW / NORMAL'
  );

  const normalizedRisk = riskLevel.toUpperCase();
  const isHighRisk = normalizedRisk.includes('HIGH');
  const isModerateRisk = normalizedRisk.includes('MODERATE');

  const riskBackground = isHighRisk
    ? 'rgba(255, 51, 102, 0.12)'
    : isModerateRisk
      ? 'rgba(255, 153, 0, 0.12)'
      : 'rgba(0, 255, 136, 0.08)';

  const riskBorder = isHighRisk
    ? '1px solid var(--neon-red)'
    : isModerateRisk
      ? '1px solid var(--neon-orange)'
      : '1px solid var(--neon-green)';

  const riskBadgeClass = isHighRisk
    ? 'badge-neon-red'
    : isModerateRisk
      ? 'badge-neon-orange'
      : 'badge-neon-green';

  const qualityScore = Number(result?.food_quality_score);
  const hasQualityScore =
    result?.food_quality_score !== null &&
    result?.food_quality_score !== undefined &&
    Number.isFinite(qualityScore);

  const confidence = Number(result?.confidence);
  const hasConfidence =
    result?.confidence !== null &&
    result?.confidence !== undefined &&
    Number.isFinite(confidence);

  const confidencePercent = hasConfidence
    ? `${(confidence <= 1 ? confidence * 100 : confidence).toFixed(1)}%`
    : 'N/A';

  const downloadUrl = result?.inspection_id != null
    ? `${apiBase.replace(/\/+$/, '')}/api/export/pdf/${encodeURIComponent(
        String(result.inspection_id)
      )}`
    : null;

  return (
    <div>
      {/* Page heading */}
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              color: 'var(--neon-cyan)',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.12em',
              marginBottom: '0.4rem',
            }}
          >
            FOODQUALITYAI / COMPUTER VISION
          </div>

          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: 0,
            }}
          >
            Live Inspection Studio
          </h1>

          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              marginTop: '0.45rem',
            }}
          >
            Analyse produce images alongside gas, moisture and pH readings.
          </p>
        </div>

        <button
          type="button"
          className="btn-cyber-secondary"
          onClick={handleReset}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <RefreshCw size={16} />
          Reset Studio
        </button>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1rem',
            background: 'rgba(255, 51, 102, 0.12)',
            border: '1px solid var(--neon-red)',
            color: 'var(--neon-red)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss error"
            style={{
              background: 'transparent',
              border: 0,
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* LEFT: Image and sensor inputs */}
        <div
          className="glass-panel"
          style={{ padding: '1.5rem', minWidth: 0 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--neon-cyan)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Optical Feed & Sample Input
            </span>

            <span className="badge-neon-cyan">RGB IMAGE</span>
          </div>

          <form onSubmit={handleRunInspection}>
            {/* Image upload */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="produce-image"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                }}
              >
                PRODUCE PHOTOGRAPH
              </label>

              <label
                htmlFor="produce-image"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  padding: '1.5rem 1rem',
                  border: '1px dashed var(--neon-cyan)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 220, 255, 0.035)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected produce preview"
                    style={{
                      maxHeight: '220px',
                      maxWidth: '100%',
                      borderRadius: 8,
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <>
                    <Upload size={30} color="var(--neon-cyan)" />
                    <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>
                      Upload a produce image
                    </strong>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                      }}
                    >
                      Click here to browse image files
                    </span>
                  </>
                )}
              </label>

              <input
                id="produce-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="cyber-input"
                style={{ marginTop: '0.75rem', width: '100%' }}
              />

              {selectedFile && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginTop: '0.65rem',
                    padding: '0.65rem 0.75rem',
                    background: 'rgba(0, 220, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: 'var(--text-main)',
                        fontSize: '0.82rem',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {selectedFile.name}
                    </div>
                    <div
                      style={{
                        color: 'var(--text-dim)',
                        fontSize: '0.72rem',
                        marginTop: '0.2rem',
                      }}
                    >
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => {
                      setSelectedFile(null);
                      setResult(null);
                      setErrorMsg(null);
                    }}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
            </div>

            {/* Category */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="produce-category"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                }}
              >
                PRODUCE CLASSIFICATION TARGET
              </label>

              <select
                id="produce-category"
                value={produceCategory}
                onChange={(e) => setProduceCategory(e.target.value)}
                className="cyber-input"
                style={{ width: '100%' }}
              >
                <option value="">Auto-Detect Produce Category</option>

                {(categories?.categories ?? [
                  'apple',
                  'banana',
                  'bitter_gourd',
                  'capsicum',
                  'orange',
                  'tomato',
                ]).map((category) => (
                  <option key={category} value={category}>
                    {category.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Sensor inputs */}
            <div
              style={{
                background: 'rgba(5, 14, 20, 0.7)',
                border: '1px solid var(--bg-card-border)',
                padding: '1.1rem',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '0.9rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--neon-green)',
                    textTransform: 'uppercase',
                  }}
                >
                  Multi-Sensor Telemetry
                </span>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={simulateSensors}
                    onChange={(e) => setSimulateSensors(e.target.checked)}
                  />
                  Simulate Sensors
                </label>
              </div>

              {simulateSensors ? (
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-dim)',
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  The backend will generate simulated gas VOC, humidity and
                  pH readings for this inspection.
                </p>
              ) : (
                <div className="grid-3" style={{ gap: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label
                      htmlFor="gas-ppm"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Gas VOC (ppm)
                    </label>
                    <input
                      id="gas-ppm"
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={gasPpm}
                      onChange={(e) => setGasPpm(e.target.value)}
                      placeholder="e.g. 45"
                      className="cyber-input"
                      style={{
                        padding: '0.55rem',
                        width: '100%',
                        marginTop: '0.35rem',
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label
                      htmlFor="humidity-pct"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Humidity (%)
                    </label>
                    <input
                      id="humidity-pct"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      required
                      value={humidityPct}
                      onChange={(e) => setHumidityPct(e.target.value)}
                      placeholder="e.g. 85"
                      className="cyber-input"
                      style={{
                        padding: '0.55rem',
                        width: '100%',
                        marginTop: '0.35rem',
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label
                      htmlFor="ph-level"
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      pH Value
                    </label>
                    <input
                      id="ph-level"
                      type="number"
                      min="0"
                      max="14"
                      step="any"
                      required
                      value={phLevel}
                      onChange={(e) => setPhLevel(e.target.value)}
                      placeholder="e.g. 4.2"
                      className="cyber-input"
                      style={{
                        padding: '0.55rem',
                        width: '100%',
                        marginTop: '0.35rem',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedFile}
              className="btn-cyber-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '0.9rem',
                opacity: isLoading || !selectedFile ? 0.65 : 1,
                cursor:
                  isLoading || !selectedFile ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Analysing Image & Sensor Data...
                </>
              ) : (
                <>
                  <Cpu size={18} />
                  Execute AI Quality Scan
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT: Results */}
        <div style={{ minWidth: 0 }}>
          {result ? (
            <div
              className="glass-panel"
              style={{ padding: '1.5rem', minWidth: 0 }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1.25rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--neon-cyan)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Analysis Report
                </span>

                <span
                  className={
                    isFresh ? 'badge-neon-green' : 'badge-neon-red'
                  }
                >
                  {condition.toUpperCase()} PRODUCE
                </span>
              </div>

              {/* Quality score */}
              <div
                style={{
                  background: 'rgba(5, 14, 20, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1.5rem',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Food Quality Score
                </div>

                <div
                  style={{
                    fontSize: 'clamp(2.2rem, 6vw, 3rem)',
                    fontWeight: 900,
                    color:
                      hasQualityScore && qualityScore >= 70
                        ? 'var(--neon-green)'
                        : 'var(--neon-orange)',
                    textShadow:
                      hasQualityScore && qualityScore >= 70
                        ? 'var(--neon-green-glow)'
                        : 'none',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {hasQualityScore ? qualityScore.toFixed(1) : 'N/A'}
                  <span
                    style={{
                      fontSize: '1.2rem',
                      color: 'var(--text-dim)',
                    }}
                  >
                    {hasQualityScore ? ' / 100' : ''}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    marginTop: '0.25rem',
                  }}
                >
                  {result.grade ?? 'Grade unavailable'}
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-dim)',
                    marginTop: '0.35rem',
                  }}
                >
                  Distribution Status:{' '}
                  <strong style={{ color: 'var(--text-main)' }}>
                    {result.status ?? 'N/A'}
                  </strong>
                </div>
              </div>

              {/* Risk assessment */}
              <div
                style={{
                  background: riskBackground,
                  border: riskBorder,
                  padding: '1.15rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.6rem',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      color: '#ffffff',
                    }}
                  >
                    ADULTERATION RISK LEVEL
                  </span>

                  <span className={riskBadgeClass}>{riskLevel}</span>
                </div>

                <p
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    margin: '0.5rem 0',
                    lineHeight: 1.6,
                  }}
                >
                  {result.adulteration_details?.recommendation ??
                    'No recommendation was provided by the inspection service.'}
                </p>

                {Array.isArray(
                  result.adulteration_details?.indicators
                ) &&
                  result.adulteration_details.indicators.length > 0 && (
                    <ul
                      style={{
                        paddingLeft: '1.1rem',
                        margin: '0.5rem 0 0',
                        fontSize: '0.78rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      {result.adulteration_details.indicators.map(
                        (indicator, index) => (
                          <li key={`${String(indicator)}-${index}`}>
                            {String(indicator)}
                          </li>
                        )
                      )}
                    </ul>
                  )}
              </div>

              {/* Prediction and sensor metrics */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--neon-cyan)',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.65rem',
                  }}
                >
                  Prediction & Sensor Telemetry
                </span>

                <div className="grid-3" style={{ gap: '0.65rem' }}>
                  <div
                    style={{
                      background: 'rgba(5, 14, 20, 0.6)',
                      padding: '0.8rem 0.5rem',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-dim)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Predicted Class
                    </div>
                    <code
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--neon-cyan)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {result.predicted_class ?? 'N/A'}
                    </code>
                  </div>

                  <div
                    style={{
                      background: 'rgba(5, 14, 20, 0.6)',
                      padding: '0.8rem 0.5rem',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-dim)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Confidence
                    </div>
                    <strong
                      style={{
                        fontSize: '0.9rem',
                        color: '#ffffff',
                      }}
                    >
                      {confidencePercent}
                    </strong>
                  </div>

                  <div
                    style={{
                      background: 'rgba(5, 14, 20, 0.6)',
                      padding: '0.8rem 0.5rem',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-dim)',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Gas (VOC)
                    </div>
                    <strong
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--neon-green)',
                      }}
                    >
                      {result.gas_ppm != null
                        ? `${result.gas_ppm} ppm`
                        : 'N/A'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Report export */}
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-cyber-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    textDecoration: 'none',
                  }}
                >
                  <FileDown size={16} />
                  Download Inspection PDF Report
                </a>
              ) : (
                <p
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}
                >
                  Report download is unavailable because the inspection ID
                  was not returned.
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '1rem',
                  color: 'var(--text-dim)',
                  fontSize: '0.75rem',
                }}
              >
                <CheckCircle2 size={15} color="var(--neon-green)" />
                Inspection response received from the backend.
              </div>
            </div>
          ) : (
            <div
              className="glass-panel"
              style={{
                textAlign: 'center',
                padding: '4rem 1.5rem',
                color: 'var(--text-muted)',
                minHeight: '300px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0, 220, 255, 0.08)',
                  border: '1px solid rgba(0, 220, 255, 0.2)',
                  marginBottom: '1.25rem',
                }}
              >
                <ImageIcon
                  size={36}
                  color="var(--neon-cyan)"
                  style={{ opacity: 0.9 }}
                />
              </div>

              <h3
                style={{
                  fontSize: '1.15rem',
                  color: '#ffffff',
                  marginBottom: '0.5rem',
                }}
              >
                Inspection Stream Inactive
              </h3>

              <p
                style={{
                  fontSize: '0.85rem',
                  maxWidth: '340px',
                  margin: '0 auto',
                  lineHeight: 1.7,
                }}
              >
                Upload a produce image, configure the sensor inputs, and
                execute the scan. Your inspection results will appear here.
              </p>

              <div
                style={{
                  marginTop: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--text-dim)',
                  fontSize: '0.75rem',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--neon-cyan)',
                  }}
                />
                Awaiting image input
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
