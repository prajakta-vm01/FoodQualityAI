
import React from 'react';
import {
  Sparkles,
  Cpu,
  Activity,
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  Leaf,
  ScanSearch,
  Thermometer,
  Database,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import type { ProduceCategories } from '../types';
import heroImage from '../assets/hero.png';

interface LandingProps {
  categories: ProduceCategories | null;
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<LandingProps> = ({
  categories,
  onNavigate,
}) => {
  const produceList = categories?.categories || [
    'apple',
    'banana',
    'bitter_gourd',
    'capsicum',
    'orange',
    'tomato',
  ];

  return (
    <div className="landing-page">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-eyebrow">
            <Sparkles size={15} />
            INTELLIGENT FOOD QUALITY MONITORING
          </div>

          <h1 className="landing-title">
            REVOLUTIONIZING FOOD SAFETY
            <br />
            <span>WITH ARTIFICIAL INTELLIGENCE</span>
          </h1>

          <p className="landing-description">
            Make informed food-quality decisions with AI-powered freshness
            classification, sensor-based indicators, and explainable
            quality scoring — all in one inspection platform.
          </p>

          <div className="landing-actions">
            <button
              className="landing-primary-button"
              onClick={() => onNavigate('inspect')}
            >
              <ScanSearch size={18} />
              Start Food Inspection
              <ArrowRight size={17} />
            </button>

            <button
              className="landing-secondary-button"
              onClick={() => onNavigate('dashboard')}
            >
              <LayoutDashboard size={18} />
              Explore Dashboard
            </button>
          </div>

          <div className="landing-trust-line">
            <span>
              <CheckCircle2 size={15} />
              Image-based inspection
            </span>
            <span>
              <CheckCircle2 size={15} />
              Sensor-assisted scoring
            </span>
            <span>
              <CheckCircle2 size={15} />
              Inspection history
            </span>
          </div>
        </div>

        <div className="landing-visual">
          <div className="landing-visual-glow" />

          <div className="landing-image-frame">
            <img
              src={heroImage}
               alt="Fresh fruits and vegetables for AI food quality inspection"
               className="landing-food-image"
            />

            <div className="landing-image-overlay">
              <div className="landing-image-label">
                <span className="landing-live-dot" />
                FOOD QUALITY INTELLIGENCE
              </div>
              <div className="landing-image-caption">
                <Leaf size={20} />
                <div>
                  <strong>Smarter food inspection</strong>
                  <span>Visual analysis and quality insights</span>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-top">
            <span className="landing-mini-icon">
              <Cpu size={17} />
            </span>
            <div>
              <strong>AI Vision</strong>
              <span>Freshness classification</span>
            </div>
          </div>

          <div className="landing-floating-card landing-floating-bottom">
            <span className="landing-mini-icon">
              <Activity size={17} />
            </span>
            <div>
              <strong>Quality Analytics</strong>
              <span>Explainable score indicators</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature heading */}
      <section className="landing-section">
        <div className="landing-section-heading">
          <div>
            <span className="landing-section-label">
              PLATFORM CAPABILITIES
            </span>
            <h2>Everything you need to inspect smarter</h2>
            <p>
              Explore the core capabilities of your FoodQualityAI system.
            </p>
          </div>
          <div className="landing-heading-icon">
            <ShieldCheck size={25} />
          </div>
        </div>

        <div className="landing-feature-grid">
          <article className="landing-feature-card">
            <div className="landing-feature-icon icon-green">
              <Cpu size={23} />
            </div>
            <span className="landing-card-number">01 / COMPUTER VISION</span>
            <h3>Freshness Classification</h3>
            <p>
              Analyze uploaded produce images using the existing
              MobileNetV2-based classification pipeline.
            </p>
            <button
              className="landing-text-link"
              onClick={() => onNavigate('inspect')}
            >
              Inspect an image <ArrowRight size={15} />
            </button>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-icon icon-mint">
              <Thermometer size={23} />
            </div>
            <span className="landing-card-number">02 / SENSOR INPUTS</span>
            <h3>Sensor-Assisted Analysis</h3>
            <p>
              Combine available sensor readings or simulated inputs
              with image-based results for a broader quality assessment.
            </p>
            <button
              className="landing-text-link"
              onClick={() => onNavigate('inspect')}
            >
              Open inspection <ArrowRight size={15} />
            </button>
          </article>

          <article className="landing-feature-card">
            <div className="landing-feature-icon icon-gold">
              <ShieldCheck size={23} />
            </div>
            <span className="landing-card-number">03 / EXPLAINABILITY</span>
            <h3>Quality Score & Insights</h3>
            <p>
              Review the quality score, deductions and warnings
              produced by your existing scoring system.
            </p>
            <button
              className="landing-text-link"
              onClick={() => onNavigate('dashboard')}
            >
              View analytics <ArrowRight size={15} />
            </button>
          </article>
        </div>
      </section>

      {/* Supported produce */}
      <section className="landing-produce-section">
        <div className="landing-section-heading">
          <div>
            <span className="landing-section-label">
              SUPPORTED CATEGORIES
            </span>
            <h2>Produce covered by the model</h2>
            <p>
              Categories returned by your backend configuration.
            </p>
          </div>
          <div className="landing-heading-icon">
            <Database size={24} />
          </div>
        </div>

        <div className="landing-produce-grid">
          {produceList.map((category) => (
            <div className="landing-produce-item" key={category}>
              <div className="landing-produce-icon">
                <Leaf size={19} />
              </div>
              <div>
                <strong>
                  {category.replace(/_/g, ' ')}
                </strong>
                <span>Freshness classes</span>
              </div>
              <CheckCircle2
                size={17}
                className="landing-produce-check"
              />
            </div>
          ))}
        </div>

        <div className="landing-note">
          <Activity size={17} />
          <p>
            Results depend on the configured model, available inputs
            and the quality of the supplied data. This tool is a
            screening aid, not a substitute for laboratory food-safety
            or chemical-adulteration testing.
          </p>
        </div>
      </section>

      {/* Workflow */}
      <section className="landing-workflow">
        <div>
          <span className="landing-section-label">SIMPLE WORKFLOW</span>
          <h2>From image to actionable insight</h2>
        </div>

        <div className="landing-workflow-grid">
          <div className="landing-workflow-step">
            <span>01</span>
            <ScanSearch size={21} />
            <strong>Upload</strong>
            <p>Select a produce image for inspection.</p>
          </div>

          <div className="landing-workflow-connector" />

          <div className="landing-workflow-step">
            <span>02</span>
            <Layers size={21} />
            <strong>Analyze</strong>
            <p>Review classification and available sensor inputs.</p>
          </div>

          <div className="landing-workflow-connector" />

          <div className="landing-workflow-step">
            <span>03</span>
            <Activity size={21} />
            <strong>Review</strong>
            <p>Explore scores and recorded inspection results.</p>
          </div>
        </div>

        <button
          className="landing-primary-button landing-bottom-button"
          onClick={() => onNavigate('inspect')}
        >
          Begin Your Inspection <ArrowRight size={17} />
        </button>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Leaf size={19} />
          <strong>FoodQualityAI</strong>
        </div>
        <span>Intelligent food quality screening and analytics</span>
      </footer>
    </div>
  );
};
