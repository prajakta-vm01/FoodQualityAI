"""
FoodQualityAI - Food Quality Scoring & Sensor Fusion Engine
Combines image freshness classification with multi-sensor readings (gas, moisture, pH)
using a scientifically transparent, explainable formula.

Important scientific distinction:
- Image freshness detects superficial optical degradation (browning, wrinkling, mold patches, rot).
- Gas sensors (e.g. MQ-135, MQ-4) estimate volatile organic compounds (VOCs), ethylene, ammonia, and ethanol released during spoilage.
- Moisture/humidity reflects dehydration or condensation promoting mold.
- pH changes indicate biochemical breakdown and microbial fermentation.
- Visible freshness alone CANNOT prove safety or chemical adulteration; adulteration detection requires chemical tests or specialized spectral sensors.
"""

from typing import Dict, Any, Optional, List

# Standard demonstration reference ranges for produce
# Note: In an industrial setting, these are calibrated per cultivar and warehouse storage specification.
SENSOR_NORMS = {
    "apple": {"gas_max_ppm": 45.0, "humidity_min": 75.0, "humidity_max": 95.0, "ph_min": 3.3, "ph_max": 4.0},
    "banana": {"gas_max_ppm": 55.0, "humidity_min": 80.0, "humidity_max": 95.0, "ph_min": 4.5, "ph_max": 5.2},
    "orange": {"gas_max_ppm": 40.0, "humidity_min": 80.0, "humidity_max": 90.0, "ph_min": 3.0, "ph_max": 4.0},
    "tomato": {"gas_max_ppm": 50.0, "humidity_min": 75.0, "humidity_max": 92.0, "ph_min": 4.1, "ph_max": 4.8},
    "capsicum": {"gas_max_ppm": 45.0, "humidity_min": 80.0, "humidity_max": 95.0, "ph_min": 4.8, "ph_max": 5.4},
    "bitter_gourd": {"gas_max_ppm": 40.0, "humidity_min": 75.0, "humidity_max": 90.0, "ph_min": 5.0, "ph_max": 6.2},
    "default": {"gas_max_ppm": 50.0, "humidity_min": 75.0, "humidity_max": 95.0, "ph_min": 4.0, "ph_max": 6.0}
}

def simulate_sensor_readings(produce_type: str, condition: str = "fresh") -> Dict[str, Any]:
    """
    Generates clearly marked demonstration simulated sensor values.
    Returns sensor readings with simulation flags.
    """
    norm = SENSOR_NORMS.get(produce_type.lower(), SENSOR_NORMS["default"])
    if condition.lower() == "fresh":
        gas = round(norm["gas_max_ppm"] * 0.45, 1) # Normal VOC emission
        humidity = round((norm["humidity_min"] + norm["humidity_max"]) / 2, 1)
        ph = round((norm["ph_min"] + norm["ph_max"]) / 2, 2)
    else:
        # Elevated VOCs due to decomposition, altered moisture, shifted pH
        gas = round(norm["gas_max_ppm"] * 1.65, 1)
        humidity = round(norm["humidity_min"] * 0.72, 1)
        ph = round(norm["ph_max"] * 1.35, 2)

    return {
        "is_simulated": True,
        "gas_ppm": gas,
        "humidity_pct": humidity,
        "ph_level": ph,
        "note": "Demonstration simulated sensor values based on typical produce storage baselines."
    }

def classify_visual_defect(produce_type: str, condition: str, confidence: float) -> List[str]:
    """
    Characterizes specific visible defects based on produce category and freshness state.
    """
    if condition.lower() == "fresh":
        return ["Uniform surface pigmentation", "Firm structural integrity", "No visible microbial colonies"]
    
    defects = {
        "apple": ["Superficial scald & enzymatic browning", "Skin shriveling (dehydration)", "Potential fungal mold penetration"],
        "banana": ["Severe brown/black necrotic spotting (senescence)", "Peel softening & structural rupture", "Microbial breakdown"],
        "orange": ["Surface mold / Penicillium fungal decay", "Peel breakdown & dark blotches", "Tissue softening"],
        "tomato": ["Water-soaked lesioning & epidermal collapse", "Dark fungal rot patches", "Surface wrinkling"],
        "capsicum": ["Sunken watery lesions (bacterial soft rot)", "Skin wrinkling & loss of turgidity", "Stem-end discoloration"],
        "bitter_gourd": ["Yellow-orange hyper-ripening", "Fungal mildew mycelium", "Surface softening and desiccation"]
    }
    return defects.get(produce_type.lower(), ["Visual surface degradation", "Texture breakdown", "Senescence"])

def assess_adulteration_risk(
    produce_type: str,
    vision_condition: str,
    gas_ppm: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    ph_level: Optional[float] = None
) -> Dict[str, Any]:
    """
    Assesses potential chemical and physical adulteration risks based on sensory anomalies.
    Common industrial produce adulteration vectors:
    - Artificial ripening agents: Calcium carbide, industrial ethylene gas
    - Chemical preservation / Formalin bath: Inhibits normal VOC/microbial activity artificially
    - Synthetic dye immersion: Malachite green on green produce (bitter gourd, capsicum)
    - Moisture injection / excessive soaking: Artificially increases batch weight
    """
    norm = SENSOR_NORMS.get(produce_type.lower(), SENSOR_NORMS["default"])
    risk_score = 10.0 # Base nominal risk
    indicators: List[str] = []
    adulteration_flags: List[str] = []

    # 1. Abnormal Gas (VOC / Ethylene / Volatiles)
    if gas_ppm is not None:
        if gas_ppm > norm["gas_max_ppm"] * 1.5:
            risk_score += 35.0
            indicators.append(f"Excessive volatile gas emissions ({gas_ppm} ppm vs max {norm['gas_max_ppm']} ppm) - possible artificial ripening agent (calcium carbide/acetylene) or severe microbial decomposition.")
            adulteration_flags.append("Artificial Ripening / High VOC Volatiles")
        elif gas_ppm < norm["gas_max_ppm"] * 0.15 and vision_condition.lower() == "stale":
            # Very low VOC despite stale appearance suggests chemical preservation (e.g. formalin dip suppressing bacterial respiration)
            risk_score += 30.0
            indicators.append("Abnormally low VOC gas emission despite aged tissue - indicates possible chemical preservative wash (e.g., Formalin bath).")
            adulteration_flags.append("Suspected Chemical Preservative / Formalin Dip")

    # 2. pH Shifts (Acidic/Alkaline dipping or washing)
    if ph_level is not None:
        if ph_level < norm["ph_min"] - 0.5:
            risk_score += 25.0
            indicators.append(f"Severely acidic pH ({ph_level} vs expected {norm['ph_min']}-{norm['ph_max']}) - indicates fermentation or acidic chemical wash.")
            adulteration_flags.append("Acidic Chemical Wash / Decomposition")
        elif ph_level > norm["ph_max"] + 0.8:
            risk_score += 30.0
            indicators.append(f"Abnormally alkaline pH ({ph_level} vs expected {norm['ph_min']}-{norm['ph_max']}) - indicates possible alkaline soap/detergent washing or adulterant coating.")
            adulteration_flags.append("Alkaline Wash / Surface Waxing Agent")

    # 3. Moisture Anomaly (Weight inflation)
    if humidity_pct is not None:
        if humidity_pct > 96.0:
            risk_score += 15.0
            indicators.append(f"Near-saturation humidity ({humidity_pct}%) - possible artificial water-drenching or moisture injection to inflate commercial batch weight.")
            adulteration_flags.append("Artificial Weight Inflation / Drenching")

    # Classify overall risk level
    if risk_score >= 60.0:
        risk_level = "HIGH RISK"
        risk_badge = "red"
        recommendation = "Reject batch; submit sample to accredited food safety lab for chemical spectrometry (calcium carbide / pesticide residue assay)."
    elif risk_score >= 35.0:
        risk_level = "MODERATE RISK"
        risk_badge = "orange"
        recommendation = "Secondary screening recommended. Inspect lot for synthetic dye leaching or uncalibrated storage environment."
    else:
        risk_level = "LOW / NORMAL"
        risk_badge = "green"
        recommendation = "Sensory telemetry aligns with normal biological parameters. Routine commercial distribution approved."

    if not indicators:
        indicators.append("No abnormal chemical or physical sensor deviations detected. Normal physiological baseline.")

    return {
        "risk_level": risk_level,
        "risk_badge": risk_badge,
        "risk_score": min(100.0, round(risk_score, 1)),
        "adulteration_flags": adulteration_flags if adulteration_flags else ["None Detected"],
        "indicators": indicators,
        "recommendation": recommendation
    }

def calculate_quality_score(
    vision_condition: str,
    vision_confidence: float,
    produce_type: str,
    gas_ppm: Optional[float] = None,
    humidity_pct: Optional[float] = None,
    ph_level: Optional[float] = None,
    is_simulated: bool = False
) -> Dict[str, Any]:
    """
    Computes an explainable Food Quality Score (0 to 100) with weightings:
    - Vision Freshness: 50%
    - Gas / VOC Level: 25%
    - Moisture / Humidity: 15%
    - pH Level: 10%
    And generates an explicit Adulteration Risk Assessment.
    """
    norm = SENSOR_NORMS.get(produce_type.lower(), SENSOR_NORMS["default"])
    warnings: List[str] = []
    deductions: List[Dict[str, Any]] = []

    # 1. Vision Score (0 to 50 points)
    if vision_condition.lower() == "fresh":
        vision_points = round(35.0 + 15.0 * max(0.0, min(1.0, vision_confidence)), 1)
    elif vision_condition.lower() == "stale":
        vision_points = round(max(5.0, 30.0 - (25.0 * max(0.0, min(1.0, vision_confidence)))), 1)
        warnings.append("Vision model detected visual degradation, rotting, or senescence.")
    else:
        vision_points = 25.0
        warnings.append("Vision model output indeterminate.")

    # 2. Gas / VOC Score (0 to 25 points)
    gas_points = 25.0
    if gas_ppm is not None:
        if gas_ppm > norm["gas_max_ppm"]:
            ratio = gas_ppm / norm["gas_max_ppm"]
            penalty = min(20.0, (ratio - 1.0) * 15.0)
            gas_points = max(5.0, round(25.0 - penalty, 1))
            warnings.append(f"Elevated gas/VOC detected ({gas_ppm} ppm vs threshold {norm['gas_max_ppm']} ppm) indicating potential metabolic decay.")
            deductions.append({"factor": "VOC / Gas Emissions", "penalty": round(penalty, 1), "value": f"{gas_ppm} ppm"})
    else:
        gas_points = 20.0
        warnings.append("Gas sensor reading unavailable; using neutral baseline.")

    # 3. Moisture / Humidity Score (0 to 15 points)
    humidity_points = 15.0
    if humidity_pct is not None:
        if humidity_pct < norm["humidity_min"]:
            diff = norm["humidity_min"] - humidity_pct
            penalty = min(12.0, (diff / 10.0) * 4.0)
            humidity_points = max(3.0, round(15.0 - penalty, 1))
            warnings.append(f"Sub-optimal humidity ({humidity_pct}% vs minimum {norm['humidity_min']}%) suggests dehydration or shriveling.")
            deductions.append({"factor": "Moisture / Humidity Deficit", "penalty": round(penalty, 1), "value": f"{humidity_pct}%"})
        elif humidity_pct > norm["humidity_max"]:
            penalty = 5.0
            humidity_points = max(5.0, round(15.0 - penalty, 1))
            warnings.append(f"Excess humidity ({humidity_pct}%) creates high condensation risk for mold growth.")
            deductions.append({"factor": "Excess Moisture", "penalty": round(penalty, 1), "value": f"{humidity_pct}%"})
    else:
        humidity_points = 12.0

    # 4. pH Score (0 to 10 points)
    ph_points = 10.0
    if ph_level is not None:
        if ph_level < norm["ph_min"] or ph_level > norm["ph_max"]:
            dev = abs(ph_level - (norm["ph_min"] + norm["ph_max"]) / 2.0)
            penalty = min(8.0, dev * 4.0)
            ph_points = max(2.0, round(10.0 - penalty, 1))
            warnings.append(f"Abnormal pH reading ({ph_level} vs expected {norm['ph_min']}-{norm['ph_max']}) indicating possible microbial fermentation or spoilage.")
            deductions.append({"factor": "pH Deviation", "penalty": round(penalty, 1), "value": f"{ph_level}"})
    else:
        ph_points = 8.0

    total_score = round(vision_points + gas_points + humidity_points + ph_points, 1)
    total_score = max(0.0, min(100.0, total_score))

    # Grade determination
    if total_score >= 85.0:
        grade = "Grade A (Premium Fresh)"
        status = "Optimal"
        color = "green"
    elif total_score >= 65.0:
        grade = "Grade B (Standard Marketable)"
        status = "Acceptable"
        color = "yellow"
    elif total_score >= 45.0:
        grade = "Grade C (Discount / Immediate Sale)"
        status = "Fair / Approaching Expiry"
        color = "orange"
    else:
        grade = "Grade D (Substandard / Rejected)"
        status = "Unfit for Distribution"
        color = "red"

    # Assess Adulteration Risk & Defects
    adulteration_assessment = assess_adulteration_risk(
        produce_type=produce_type,
        vision_condition=vision_condition,
        gas_ppm=gas_ppm,
        humidity_pct=humidity_pct,
        ph_level=ph_level
    )
    detected_defects = classify_visual_defect(
        produce_type=produce_type,
        condition=vision_condition,
        confidence=vision_confidence
    )

    return {
        "quality_score": total_score,
        "grade": grade,
        "status": status,
        "color": color,
        "score_breakdown": {
            "vision_points": vision_points,
            "gas_points": gas_points,
            "humidity_points": humidity_points,
            "ph_points": ph_points,
            "max_possible": 100.0
        },
        "sensor_data": {
            "is_simulated": is_simulated,
            "gas_ppm": gas_ppm,
            "humidity_pct": humidity_pct,
            "ph_level": ph_level
        },
        "detected_defects": detected_defects,
        "adulteration_assessment": adulteration_assessment,
        "deductions": deductions,
        "warnings": warnings,
        "scientific_disclaimer": "This quality score evaluates visible freshness and physical environmental indicators. It does NOT independently verify pathogens, chemical residue, or internal adulterants without certified lab spectroscopy."
    }
