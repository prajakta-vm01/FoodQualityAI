"""
FoodQualityAI - Dataset Audit Pipeline
Audits the raw produce freshness dataset:
- Image counts per class and produce type
- Image format distribution
- Integrity and readability check (corrupted images)
- Detect potential duplicate files (by size and MD5 hash sampling)
- Class imbalance reporting
- Exports a complete audit report to reports/dataset_audit_report.json and .md
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from collections import defaultdict
from PIL import Image

def get_file_hash(filepath, block_size=65536):
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            buf = f.read(block_size)
            while len(buf) > 0:
                hasher.update(buf)
                buf = f.read(block_size)
        return hasher.hexdigest()
    except Exception:
        return None

def audit_dataset(data_dir: str = "data", output_dir: str = "reports"):
    data_path = Path(data_dir).resolve()
    reports_path = Path(output_dir).resolve()
    reports_path.mkdir(parents=True, exist_ok=True)

    print(f"==================================================")
    print(f"Starting FoodQualityAI Dataset Audit: {data_path}")
    print(f"==================================================")

    if not data_path.exists():
        raise FileNotFoundError(f"Data directory '{data_path}' does not exist.")

    class_dirs = [d for d in data_path.iterdir() if d.is_dir()]
    class_names = sorted([d.name for d in class_dirs])

    audit_results = {
        "dataset_path": str(data_path),
        "total_classes": len(class_names),
        "class_names": class_names,
        "total_images": 0,
        "corrupted_images": [],
        "class_distribution": {},
        "extension_distribution": defaultdict(int),
        "produce_distribution": defaultdict(lambda: {"fresh": 0, "stale": 0, "total": 0}),
        "duplicates_detected": 0,
        "summary": {}
    }

    seen_hashes = {}
    duplicate_count = 0

    for class_name in class_names:
        class_folder = data_path / class_name
        files = [f for f in class_folder.iterdir() if f.is_file()]
        class_count = len(files)
        audit_results["class_distribution"][class_name] = {
            "total_files": class_count,
            "valid_images": 0,
            "corrupted": 0,
            "extensions": defaultdict(int)
        }

        # Parse condition and produce category
        is_fresh = class_name.startswith("fresh_")
        produce_type = class_name.replace("fresh_", "").replace("stale_", "")
        
        for file in files:
            ext = file.suffix.lower()
            audit_results["extension_distribution"][ext] += 1
            audit_results["class_distribution"][class_name]["extensions"][ext] += 1
            audit_results["total_images"] += 1

            # Validate readability
            try:
                with Image.open(file) as img:
                    img.verify() # Verify header
                audit_results["class_distribution"][class_name]["valid_images"] += 1
                
                if is_fresh:
                    audit_results["produce_distribution"][produce_type]["fresh"] += 1
                else:
                    audit_results["produce_distribution"][produce_type]["stale"] += 1
                audit_results["produce_distribution"][produce_type]["total"] += 1

            except Exception as e:
                audit_results["class_distribution"][class_name]["corrupted"] += 1
                audit_results["corrupted_images"].append({
                    "file": str(file.relative_to(data_path)),
                    "error": str(e)
                })

            # Duplicate check
            f_hash = get_file_hash(file)
            if f_hash:
                if f_hash in seen_hashes:
                    duplicate_count += 1
                else:
                    seen_hashes[f_hash] = str(file.relative_to(data_path))

    audit_results["duplicates_detected"] = duplicate_count
    
    # Calculate imbalance ratio (max class / min class)
    counts = [v["valid_images"] for v in audit_results["class_distribution"].values()]
    max_c = max(counts) if counts else 0
    min_c = min(counts) if counts else 0
    imbalance_ratio = round(max_c / max(1, min_c), 2)

    audit_results["summary"] = {
        "total_images": audit_results["total_images"],
        "valid_images": sum(counts),
        "corrupted_images_count": len(audit_results["corrupted_images"]),
        "duplicates_count": duplicate_count,
        "imbalance_ratio_max_min": imbalance_ratio,
        "produce_categories_count": len(audit_results["produce_distribution"])
    }

    # Save JSON Report
    json_path = reports_path / "dataset_audit_report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)

    # Save Markdown Report
    md_path = reports_path / "dataset_audit_report.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# FoodQualityAI — Real Dataset Audit Report\n\n")
        f.write(f"- **Dataset Path**: `{audit_results['dataset_path']}`\n")
        f.write(f"- **Total Classes**: {audit_results['total_classes']}\n")
        f.write(f"- **Total Images Detected**: {audit_results['total_images']}\n")
        f.write(f"- **Valid Readable Images**: {audit_results['summary']['valid_images']}\n")
        f.write(f"- **Corrupted Images**: {audit_results['summary']['corrupted_images_count']}\n")
        f.write(f"- **Exact Duplicates Detected**: {audit_results['summary']['duplicates_count']}\n")
        f.write(f"- **Class Imbalance Ratio (Max/Min)**: {imbalance_ratio}x\n\n")

        f.write("## 1. Class Distribution\n\n")
        f.write("| Class Name | Total Files | Valid Images | Corrupted | Primary Extension |\n")
        f.write("|---|---|---|---|---|\n")
        for cname, stats in audit_results["class_distribution"].items():
            ext_str = ", ".join([f"{k} ({v})" for k, v in stats["extensions"].items()])
            f.write(f"| `{cname}` | {stats['total_files']} | {stats['valid_images']} | {stats['corrupted']} | {ext_str} |\n")

        f.write("\n## 2. Produce Category Fresh vs. Stale Breakdown\n\n")
        f.write("| Produce Category | Fresh Count | Stale Count | Total Produce Images | Freshness Ratio |\n")
        f.write("|---|---|---|---|---|\n")
        for produce, pstats in audit_results["produce_distribution"].items():
            ratio = round(pstats["fresh"] / max(1, pstats["total"]) * 100, 1)
            f.write(f"| **{produce.capitalize()}** | {pstats['fresh']} | {pstats['stale']} | {pstats['total']} | {ratio}% Fresh |\n")

        f.write("\n## 3. Data Integrity & Pipeline Recommendations\n\n")
        f.write("1. **Corrupted Images**: Zero unreadable files were detected if 0 corrupted. Validated image headers successfully.\n")
        f.write("2. **Format Uniformity**: Standardize all images to 224x224 RGB tensors during training.\n")
        f.write("3. **Split Strategy**: Stratified split into 80% Train, 10% Validation, 10% Test ensuring uniform class proportions.\n")

    print(f"Audit completed successfully!")
    print(f"Total images: {audit_results['total_images']}")
    print(f"Corrupted: {len(audit_results['corrupted_images'])}")
    print(f"Duplicates: {duplicate_count}")
    print(f"Reports saved to: {json_path} and {md_path}")
    return audit_results

if __name__ == "__main__":
    audit_dataset()
