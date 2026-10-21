
import React from 'react';
import {
  Activity,
  ArrowRight,
  Clock,
  Eye,
  Leaf,
  LayoutDashboard,
  ScanLine,
  ShieldCheck,
  TrendingUp,
  Layers,
} from 'lucide-react';
import type { DashboardStats, InspectionRecord } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  recentInspections: InspectionRecord[];
  onSelectInspection: (record: InspectionRecord) => void;
  onNavigate: (view: string) => void;
  currentRole: string;
  onRoleChange: (role: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  recentInspections,
  onSelectInspection,
  onNavigate,
  currentRole,
  onRoleChange,
}) => {
  const total = stats?.total_inspections ?? 0;
  const fresh = stats?.fresh_count ?? 0;
  const stale = stats?.stale_count ?? 0;

  const averageScore =
    recentInspections.length > 0
      ? Math.round(
          recentInspections.reduce(
            (sum, item) => sum + item.food_quality_score,
            0
          ) / recentInspections.length
        )
      : null;

  const freshPercentage =
    total > 0 ? Math.round((fresh / total) * 100) : 0;

  const categoryEntries = Object.entries(stats?.by_category ?? {});
  const roles = ['all', 'consumer', 'retailer', 'inspector'];

  const scoreColor =
    averageScore === null
      ? '#a8b8ae'
      : averageScore >= 75
        ? '#a5f36b'
        : averageScore >= 50
          ? '#f6c66b'
          : '#ff8a80';

  return (
    <div className="qa-dashboard">
      <section className="qa-dashboard-heading">
        <div>
          <div className="qa-eyebrow">
            <LayoutDashboard size={15} />
            FOOD QUALITY INTELLIGENCE
          </div>

          <h1>Analytics Dashboard</h1>

          <p>
            Monitor inspection activity, review produce quality, and explore
            your recorded inspection results.
          </p>
        </div>

        <div className="qa-role-control">
          <span>Perspective</span>
          {roles.map((role) => (
            <button
              key={role}
              type="button"
              className={currentRole === role ? 'selected' : ''}
              onClick={() => onRoleChange(role)}
              aria-pressed={currentRole === role}
            >
              {role === 'all' ? 'All roles' : role}
            </button>
          ))}
        </div>
      </section>

      <section className="qa-stat-grid">
        <article className="qa-stat-card">
          <div className="qa-stat-top">
            <span>Total inspections</span>
            <div className="qa-stat-icon">
              <ScanLine size={20} />
            </div>
          </div>
          <strong>{total.toLocaleString()}</strong>
          <p>Inspection records available</p>
        </article>

        <article className="qa-stat-card">
          <div className="qa-stat-top">
            <span>Fresh classifications</span>
            <div className="qa-stat-icon fresh">
              <Leaf size={20} />
            </div>
          </div>
          <strong>{fresh.toLocaleString()}</strong>
          <p>{freshPercentage}% of all recorded inspections</p>
        </article>

        <article className="qa-stat-card">
          <div className="qa-stat-top">
            <span>Stale classifications</span>
            <div className="qa-stat-icon warning">
              <Activity size={20} />
            </div>
          </div>
          <strong>{stale.toLocaleString()}</strong>
          <p>Items classified as stale or defective</p>
        </article>

        <article className="qa-stat-card">
          <div className="qa-stat-top">
            <span>Average quality score</span>
            <div className="qa-stat-icon score">
              <TrendingUp size={20} />
            </div>
          </div>
          <strong>
            {averageScore === null ? '—' : averageScore}
            {averageScore !== null && (
              <small className="qa-score-total">/100</small>
            )}
          </strong>
          <p>Calculated from the loaded inspection records</p>
        </article>
      </section>

      <section className="qa-analytics-grid">
        <article className="qa-panel qa-score-panel">
          <div className="qa-panel-heading">
            <div>
              <span className="qa-eyebrow">QUALITY OVERVIEW</span>
              <h2>Food quality score</h2>
            </div>
            <span className="qa-panel-icon">
              <ShieldCheck size={19} />
            </span>
          </div>

          {averageScore === null ? (
            <div className="qa-empty-inline">
              <Activity size={30} />
              <strong>No score data yet</strong>
              <p>Complete an inspection to display the average score.</p>
            </div>
          ) : (
            <>
              <div className="qa-score-display">
                <strong style={{ color: scoreColor }}>{averageScore}</strong>
                <span>/ 100</span>
              </div>

              <div
                className="qa-progress-track"
                role="progressbar"
                aria-label="Average food quality score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.max(0, Math.min(100, averageScore))}
              >
                <div
                  className="qa-progress-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, averageScore))}%`,
                    background: scoreColor,
                  }}
                />
              </div>

              <p className="qa-helper">
                Average of the currently loaded inspection records. This is
                an indicator, not a laboratory food-safety certification.
              </p>
            </>
          )}

          <div className="qa-score-footer">
            <div>
              <span>Fresh</span>
              <strong>{fresh}</strong>
            </div>
            <div>
              <span>Stale / defect</span>
              <strong>{stale}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{total}</strong>
            </div>
          </div>
        </article>

        <article className="qa-panel">
          <div className="qa-panel-heading">
            <div>
              <span className="qa-eyebrow">INSPECTION BREAKDOWN</span>
              <h2>Produce categories</h2>
            </div>
            <span className="qa-panel-icon">
              <Layers size={19} />
            </span>
          </div>

          {categoryEntries.length === 0 ? (
            <div className="qa-empty-inline">
              <Layers size={30} />
              <strong>No category data yet</strong>
              <p>Category statistics will appear after inspections.</p>
            </div>
          ) : (
            <div className="qa-category-list">
              {categoryEntries.map(([category, count]) => {
                const percentage =
                  total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <div className="qa-category-item" key={category}>
                    <div className="qa-category-label">
                      <span>{category.replace(/_/g, ' ')}</span>
                      <strong>
                        {count} <small>({percentage}%)</small>
                      </strong>
                    </div>

                    <div className="qa-progress-track qa-category-track">
                      <div
                        className="qa-progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="qa-panel qa-recent-panel">
        <div className="qa-panel-heading qa-recent-heading">
          <div>
            <span className="qa-eyebrow">AUDIT & ACTIVITY</span>
            <h2>Recent inspections</h2>
            <p>Review the latest recorded inspection results.</p>
          </div>

          <button
            className="qa-secondary-button"
            type="button"
            onClick={() => onNavigate('history')}
          >
            View all history <ArrowRight size={16} />
          </button>
        </div>

        {recentInspections.length === 0 ? (
          <div className="qa-empty-state">
            <div className="qa-empty-icon">
              <Clock size={28} />
            </div>
            <h3>No inspections recorded yet</h3>
            <p>
              Start with a single image inspection or inspect a batch of
              produce to populate your dashboard.
            </p>
            <button
              className="qa-primary-button"
              type="button"
              onClick={() => onNavigate('inspect')}
            >
              Start an inspection <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <div className="qa-table-wrap">
            <table className="qa-inspection-table">
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Produce</th>
                  <th>Condition</th>
                  <th>Confidence</th>
                  <th>Quality score</th>
                  <th>Risk indicator</th>
                  <th>Sensor mode</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {recentInspections.slice(0, 6).map((record) => {
                  const condition = record.condition?.toLowerCase();
                  const risk = record.adulteration_risk ?? 'Not available';
                  const riskUpper = risk.toUpperCase();

                  const riskClass = riskUpper.includes('HIGH')
                    ? 'risk-high'
                    : riskUpper.includes('MODERATE')
                      ? 'risk-medium'
                      : riskUpper.includes('LOW')
                        ? 'risk-low'
                        : 'risk-unknown';

                  return (
                    <tr key={record.inspection_id}>
                      <td>
                        <code>{record.inspection_id}</code>
                      </td>
                      <td className="qa-produce-name">
                        {record.produce_category.replace(/_/g, ' ')}
                      </td>
                      <td>
                        <span
                          className={`qa-status ${
                            condition === 'fresh' ? 'status-fresh' : 'status-stale'
                          }`}
                        >
                          <span />
                          {record.condition}
                        </span>
                      </td>
                      <td>
                        {typeof record.confidence === 'number'
                          ? `${(record.confidence * 100).toFixed(1)}%`
                          : '—'}
                      </td>
                      <td>
                        <strong>{record.food_quality_score}</strong>
                        <span className="qa-muted"> / 100</span>
                      </td>
                      <td>
                        <span className={`qa-risk ${riskClass}`}>{risk}</span>
                      </td>
                      <td>
                        <span
                          className={`qa-sensor ${
                            record.is_sensor_simulated ? 'sensor-simulated' : 'sensor-physical'
                          }`}
                        >
                          {record.is_sensor_simulated ? 'Simulated' : 'Physical'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="qa-view-button"
                          type="button"
                          onClick={() => onSelectInspection(record)}
                          aria-label={`View inspection ${record.inspection_id}`}
                        >
                          <Eye size={15} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
