"""
FoodQualityAI - SQLite Database Layer
Stores inspection history, sensor telemetry, vision predictions, grades, and report metadata.
Images are saved to backend/uploads/ rather than storing large BLOBs in SQLite.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "food_quality.db"
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"

def get_connection():
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id TEXT UNIQUE NOT NULL,
        timestamp TEXT NOT NULL,
        image_filename TEXT NOT NULL,
        image_path TEXT NOT NULL,
        produce_category TEXT NOT NULL,
        predicted_class TEXT NOT NULL,
        condition TEXT NOT NULL,
        confidence REAL NOT NULL,
        is_model_trained INTEGER NOT NULL,
        food_quality_score REAL NOT NULL,
        grade TEXT NOT NULL,
        status TEXT NOT NULL,
        is_sensor_simulated INTEGER NOT NULL,
        gas_ppm REAL,
        humidity_pct REAL,
        ph_level REAL,
        warnings_json TEXT,
        deductions_json TEXT,
        probabilities_json TEXT,
        notes TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON inspections(timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_produce ON inspections(produce_category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_condition ON inspections(condition);")
    conn.commit()
    conn.close()

def insert_inspection(record: Dict[str, Any]) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO inspections (
        inspection_id, timestamp, image_filename, image_path, produce_category,
        predicted_class, condition, confidence, is_model_trained, food_quality_score,
        grade, status, is_sensor_simulated, gas_ppm, humidity_pct, ph_level,
        warnings_json, deductions_json, probabilities_json, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record["inspection_id"],
        record.get("timestamp", datetime.now().isoformat()),
        record["image_filename"],
        record["image_path"],
        record["produce_category"],
        record["predicted_class"],
        record["condition"],
        record["confidence"],
        1 if record.get("is_model_trained", True) else 0,
        record["food_quality_score"],
        record["grade"],
        record["status"],
        1 if record.get("is_sensor_simulated", False) else 0,
        record.get("gas_ppm"),
        record.get("humidity_pct"),
        record.get("ph_level"),
        json.dumps(record.get("warnings", [])),
        json.dumps(record.get("deductions", [])),
        json.dumps(record.get("probabilities", {})),
        record.get("notes", "")
    ))
    last_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return last_id

def get_inspections(
    produce_category: Optional[str] = None,
    condition: Optional[str] = None,
    grade: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM inspections WHERE 1=1"
    params = []

    if produce_category and produce_category.lower() != "all":
        query += " AND LOWER(produce_category) = ?"
        params.append(produce_category.lower())
    if condition and condition.lower() != "all":
        query += " AND LOWER(condition) = ?"
        params.append(condition.lower())
    if grade and grade.lower() != "all":
        query += " AND grade LIKE ?"
        params.append(f"%{grade}%")

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        d["warnings"] = json.loads(d["warnings_json"]) if d.get("warnings_json") else []
        d["deductions"] = json.loads(d["deductions_json"]) if d.get("deductions_json") else []
        d["probabilities"] = json.loads(d["probabilities_json"]) if d.get("probabilities_json") else {}
        results.append(d)
    conn.close()
    return results

def get_inspection_by_id(inspection_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inspections WHERE inspection_id = ?", (inspection_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["warnings"] = json.loads(d["warnings_json"]) if d.get("warnings_json") else []
    d["deductions"] = json.loads(d["deductions_json"]) if d.get("deductions_json") else []
    d["probabilities"] = json.loads(d["probabilities_json"]) if d.get("probabilities_json") else {}
    return d

def get_dashboard_stats() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM inspections")
    total_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM inspections WHERE LOWER(condition) = 'fresh'")
    fresh_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM inspections WHERE LOWER(condition) = 'stale'")
    stale_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM inspections WHERE food_quality_score < 65.0")
    attention_required = cursor.fetchone()[0]

    cursor.execute("SELECT produce_category, COUNT(*) as c FROM inspections GROUP BY produce_category")
    by_category = {r[0]: r[1] for r in cursor.fetchall()}

    cursor.execute("SELECT grade, COUNT(*) as c FROM inspections GROUP BY grade")
    by_grade = {r[0]: r[1] for r in cursor.fetchall()}

    conn.close()
    return {
        "total_inspections": total_count,
        "fresh_count": fresh_count,
        "stale_count": stale_count,
        "attention_required_count": attention_required,
        "by_category": by_category,
        "by_grade": by_grade
    }
