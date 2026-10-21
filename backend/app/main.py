"""
FoodQualityAI - FastAPI Backend Application
Provides full REST API endpoints for:
- Health and model readiness checks
- Produce classes metadata
- Single image inspection (with optional sensor readings or simulation)
- Batch image inspection
- Inspection history with search/filter
- Single inspection details
- Dashboard statistics
- CSV and PDF report generation
"""

import os
import sys
import uuid
import json
import io
import csv
from pathlib import Path
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from PIL import Image

# Add paths
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(ROOT_DIR))

from ml.model import FreshnessClassifier, DEFAULT_CLASSES
from ml.scoring import calculate_quality_score, simulate_sensor_readings
from backend.app.db import (
    init_db,
    insert_inspection,
    get_inspections,
    get_inspection_by_id,
    get_dashboard_stats,
    UPLOADS_DIR
)

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

app = FastAPI(
    title="FoodQualityAI API",
    description="AI-Powered Smart Food Quality & Freshness Detection Industrial System",
    version="1.0.0"
)

# Enable CORS for local development (React/Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for image serving
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Initialize Database and ML Classifier on startup
init_db()
classifier = FreshnessClassifier()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FoodQualityAI Backend",
        "model_loaded": classifier.is_trained,
        "supported_classes_count": len(classifier.classes),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/model-status")
def model_status():
    return {
        "is_trained": classifier.is_trained,
        "model_path": str(classifier.model_path),
        "device": str(classifier.device),
        "classes": classifier.classes,
        "metadata": classifier.model_info
    }

@app.get("/api/produce-categories")
def get_produce_categories():
    return {
        "categories": ["apple", "banana", "bitter_gourd", "capsicum", "orange", "tomato"],
        "classes": classifier.classes
    }

@app.get("/api/simulate-sensors")
def simulate_sensors_endpoint(produce_type: str = "apple", condition: str = "fresh"):
    return simulate_sensor_readings(produce_type, condition)

@app.post("/api/inspect")
async def inspect_single_image(
    file: UploadFile = File(...),
    produce_category: Optional[str] = Form(None),
    simulate_sensors: bool = Form(False),
    gas_ppm: Optional[float] = Form(None),
    humidity_pct: Optional[float] = Form(None),
    ph_level: Optional[float] = Form(None),
    notes: Optional[str] = Form("")
):
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a valid JPG or PNG image.")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        image.verify() # Verify image header
        image = Image.open(io.BytesIO(contents)) # Reopen after verify
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Corrupted or unreadable image file: {str(e)}")

    # Save image to uploads folder
    ext = Path(file.filename).suffix or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    save_path = UPLOADS_DIR / unique_filename
    with open(save_path, "wb") as f:
        f.write(contents)

    # Run ML Inference
    vision_result = classifier.predict_image(image)
    predicted_class = vision_result["predicted_class"]
    condition = vision_result["condition"]
    detected_produce = vision_result["produce_type"]
    confidence = vision_result["confidence"]
    is_trained = vision_result["is_trained"]
    probabilities = vision_result["probabilities"]

    chosen_produce = produce_category.lower() if produce_category and produce_category.strip() else detected_produce

    # Sensor Fusion
    if simulate_sensors:
        sim_data = simulate_sensor_readings(chosen_produce, condition)
        actual_gas = sim_data["gas_ppm"]
        actual_humidity = sim_data["humidity_pct"]
        actual_ph = sim_data["ph_level"]
        is_sensor_simulated = True
    else:
        actual_gas = gas_ppm
        actual_humidity = humidity_pct
        actual_ph = ph_level
        is_sensor_simulated = False

    # Score calculation
    score_data = calculate_quality_score(
        vision_condition=condition,
        vision_confidence=confidence,
        produce_type=chosen_produce,
        gas_ppm=actual_gas,
        humidity_pct=actual_humidity,
        ph_level=actual_ph,
        is_simulated=is_sensor_simulated
    )

    inspection_id = f"INS-{uuid.uuid4().hex[:8].upper()}"
    record = {
        "inspection_id": inspection_id,
        "timestamp": datetime.now().isoformat(),
        "image_filename": unique_filename,
        "image_path": f"/uploads/{unique_filename}",
        "produce_category": chosen_produce,
        "predicted_class": predicted_class,
        "condition": condition,
        "confidence": confidence,
        "is_model_trained": is_trained,
        "food_quality_score": score_data["quality_score"],
        "grade": score_data["grade"],
        "status": score_data["status"],
        "adulteration_risk": score_data["adulteration_assessment"]["risk_level"],
        "adulteration_details": score_data["adulteration_assessment"],
        "detected_defects": score_data["detected_defects"],
        "is_sensor_simulated": is_sensor_simulated,
        "gas_ppm": actual_gas,
        "humidity_pct": actual_humidity,
        "ph_level": actual_ph,
        "warnings": score_data["warnings"],
        "deductions": score_data["deductions"],
        "probabilities": probabilities,
        "notes": notes
    }

    insert_inspection(record)

    return {
        "success": True,
        "record": record,
        "score_data": score_data
    }

@app.post("/api/batch-inspect")
async def batch_inspect(
    files: List[UploadFile] = File(...),
    simulate_sensors: bool = Form(True)
):
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded.")
    if len(files) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 files per batch to prevent memory strain.")

    results = []
    failed = []

    for file in files:
        try:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
            image.verify()
            image = Image.open(io.BytesIO(contents))

            ext = Path(file.filename).suffix or ".jpg"
            unique_filename = f"{uuid.uuid4().hex}{ext}"
            save_path = UPLOADS_DIR / unique_filename
            with open(save_path, "wb") as f:
                f.write(contents)

            vision_result = classifier.predict_image(image)
            condition = vision_result["condition"]
            produce = vision_result["produce_type"]

            sim_data = simulate_sensor_readings(produce, condition) if simulate_sensors else {}
            score_data = calculate_quality_score(
                vision_condition=condition,
                vision_confidence=vision_result["confidence"],
                produce_type=produce,
                gas_ppm=sim_data.get("gas_ppm"),
                humidity_pct=sim_data.get("humidity_pct"),
                ph_level=sim_data.get("ph_level"),
                is_simulated=simulate_sensors
            )

            insp_id = f"INS-{uuid.uuid4().hex[:8].upper()}"
            record = {
                "inspection_id": insp_id,
                "timestamp": datetime.now().isoformat(),
                "image_filename": unique_filename,
                "image_path": f"/uploads/{unique_filename}",
                "produce_category": produce,
                "predicted_class": vision_result["predicted_class"],
                "condition": condition,
                "confidence": vision_result["confidence"],
                "is_model_trained": vision_result["is_trained"],
                "food_quality_score": score_data["quality_score"],
                "grade": score_data["grade"],
                "status": score_data["status"],
                "adulteration_risk": score_data["adulteration_assessment"]["risk_level"],
                "adulteration_details": score_data["adulteration_assessment"],
                "detected_defects": score_data["detected_defects"],
                "is_sensor_simulated": simulate_sensors,
                "gas_ppm": sim_data.get("gas_ppm"),
                "humidity_pct": sim_data.get("humidity_pct"),
                "ph_level": sim_data.get("ph_level"),
                "warnings": score_data["warnings"],
                "deductions": score_data["deductions"],
                "probabilities": vision_result["probabilities"],
                "notes": f"Batch upload: {file.filename}"
            }
            insert_inspection(record)
            results.append(record)
        except Exception as e:
            failed.append({"filename": file.filename, "error": str(e)})

    return {
        "success": True,
        "processed_count": len(results),
        "failed_count": len(failed),
        "results": results,
        "failed": failed
    }

@app.get("/api/dashboard-stats")
def dashboard_stats():
    return get_dashboard_stats()

@app.get("/api/inspections")
def list_inspections(
    produce_category: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    grade: Optional[str] = Query(None),
    limit: int = Query(50),
    offset: int = Query(0)
):
    return get_inspections(
        produce_category=produce_category,
        condition=condition,
        grade=grade,
        limit=limit,
        offset=offset
    )

@app.get("/api/inspections/{inspection_id}")
def inspection_detail(inspection_id: str):
    record = get_inspection_by_id(inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found.")
    return record

@app.get("/api/export/csv")
def export_csv():
    records = get_inspections(limit=1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Inspection ID", "Timestamp", "Produce Category", "Predicted Class",
        "Condition", "Confidence", "Quality Score", "Grade", "Status",
        "Simulated Sensors", "Gas (PPM)", "Humidity (%)", "pH Level", "Notes"
    ])
    for r in records:
        writer.writerow([
            r["inspection_id"],
            r["timestamp"],
            r["produce_category"],
            r["predicted_class"],
            r["condition"],
            f"{r['confidence']*100:.1f}%",
            r["food_quality_score"],
            r["grade"],
            r["status"],
            "Yes" if r["is_sensor_simulated"] else "No",
            r["gas_ppm"] if r["gas_ppm"] is not None else "",
            r["humidity_pct"] if r["humidity_pct"] is not None else "",
            r["ph_level"] if r["ph_level"] is not None else "",
            r.get("notes", "")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=food_quality_inspections_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@app.get("/api/export/pdf/{inspection_id}")
def export_inspection_pdf(inspection_id: str):
    record = get_inspection_by_id(inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found.")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#166534'),
        spaceAfter=15
    )
    story.append(Paragraph("FoodQualityAI — Certified Quality Audit Report", title_style))
    story.append(Paragraph(f"Inspection ID: <b>{record['inspection_id']}</b> | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    story.append(Spacer(1, 15))

    data = [
        ["Attribute", "Specification / Measurement"],
        ["Produce Category", record['produce_category'].capitalize()],
        ["Vision Classification", record['predicted_class']],
        ["Vision Freshness Condition", record['condition'].upper()],
        ["Model Confidence", f"{record['confidence']*100:.2f}%"],
        ["Overall Food Quality Score", f"{record['food_quality_score']} / 100"],
        ["Commercial Grade", record['grade']],
        ["Distribution Status", record['status']],
        ["Sensor Mode", "Demonstration Simulation" if record['is_sensor_simulated'] else "Physical Telemetry"],
        ["Gas / VOC Reading", f"{record['gas_ppm']} ppm" if record['gas_ppm'] is not None else "N/A"],
        ["Moisture / Humidity", f"{record['humidity_pct']}%" if record['humidity_pct'] is not None else "N/A"],
        ["pH Level", f"{record['ph_level']}" if record['ph_level'] is not None else "N/A"],
        ["Adulteration Risk Level", record.get('adulteration_risk', 'LOW / NORMAL')],
    ]

    t = Table(data, colWidths=[200, 300])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#22c55e')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 5),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f8fafc')),
        ('GRID', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,1), (-1,-1), 4),
        ('BOTTOMPADDING', (0,1), (-1,-1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))

    story.append(Paragraph("<b>Chemical Adulteration & Defect Evaluation (CDAC PS #2):</b>", styles['Heading3']))
    adulteration_info = record.get('adulteration_details', {})
    recom = adulteration_info.get('recommendation', 'Sensory telemetry aligns with normal biological baseline.')
    story.append(Paragraph(f"• <b>Assessed Risk Level:</b> {record.get('adulteration_risk', 'LOW / NORMAL')}", styles['Normal']))
    story.append(Paragraph(f"• <b>Regulatory Recommendation:</b> {recom}", styles['Normal']))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Scientific Integrity & Safety Disclaimer:</b>", styles['Heading3']))
    disclaimer_text = (
        "This evaluation integrates computer-vision surface classification with calibrated environmental "
        "sensor thresholds. Computer vision detects visible exterior degradation (senescence, discoloration, decay). "
        "It does NOT independently confirm microbiological pathogens (e.g. Salmonella, E. coli), pesticides, or chemical "
        "adulterants without secondary laboratory chemical verification."
    )
    story.append(Paragraph(disclaimer_text, styles['Normal']))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=inspection_{inspection_id}.pdf"}
    )
