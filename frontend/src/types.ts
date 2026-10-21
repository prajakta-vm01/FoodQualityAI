export interface InspectionRecord {
  id: number;
  inspection_id: string;
  timestamp: string;
  image_filename: string;
  image_path: string;
  produce_category: string;
  predicted_class: string;
  condition: string;
  confidence: number;
  is_model_trained: number | boolean;
  food_quality_score: number;
  grade: string;
  status: string;
  adulteration_risk?: string;
  adulteration_details?: {
    risk_level: string;
    risk_badge: string;
    risk_score: number;
    adulteration_flags: string[];
    indicators: string[];
    recommendation: string;
  };
  detected_defects?: string[];
  is_sensor_simulated: number | boolean;
  gas_ppm: number | null;
  humidity_pct: number | null;
  ph_level: number | null;
  warnings: string[];
  deductions: Array<{ factor: string; penalty: number; value: string }>;
  probabilities: Record<string, number>;
  notes?: string;
}

export type StakeholderRole = 'all' | 'consumer' | 'retailer' | 'inspector';

export interface DashboardStats {
  total_inspections: number;
  fresh_count: number;
  stale_count: number;
  attention_required_count: number;
  by_category: Record<string, number>;
  by_grade: Record<string, number>;
}

export interface ModelStatus {
  is_trained: boolean;
  model_path: string;
  device: string;
  classes: string[];
  metadata?: any;
}

export interface ProduceCategories {
  categories: string[];
  classes: string[];
}
