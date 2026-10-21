"""
FoodQualityAI - Model Evaluation Pipeline
Evaluates the saved model on the held-out test split (reports/dataset_splits.json).
Calculates and saves:
- Overall Accuracy
- Precision, Recall, F1-Score (macro, weighted)
- Per-Class Classification Report
- Confusion Matrix
- Exports evaluation report to reports/model_evaluation_report.json and .md
"""

import os
import sys
import json
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

import torch
from torch.utils.data import DataLoader
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report, confusion_matrix

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from ml.model import build_model, get_transforms, DEFAULT_CLASSES
from scripts.train_model import ProduceDataset

def evaluate_model(
    splits_path: str = "reports/dataset_splits.json",
    model_path: str = "models/best_freshness_model.pt",
    output_dir: str = "reports",
    max_eval_samples: int = None
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"=== FoodQualityAI Model Evaluation ===")
    print(f"Device: {device}")

    splits_file = ROOT_DIR / splits_path
    if not splits_file.exists():
        raise FileNotFoundError(f"Splits file {splits_file} not found.")

    with open(splits_file, "r", encoding="utf-8") as f:
        splits_data = json.load(f)

    classes = splits_data["metadata"]["classes"]
    test_items = splits_data["test"]

    if max_eval_samples and max_eval_samples < len(test_items):
        print(f"Subsampling {max_eval_samples} test samples for fast evaluation...")
        test_items = test_items[:max_eval_samples]

    print(f"Evaluating on {len(test_items)} test samples across {len(classes)} classes...")

    test_dataset = ProduceDataset(test_items, ROOT_DIR, transform=get_transforms(is_train=False))
    test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)

    # Load model
    m_path = ROOT_DIR / model_path
    if not m_path.exists():
        raise FileNotFoundError(f"Trained model checkpoint not found at {m_path}.")

    model = build_model(num_classes=len(classes), pretrained=False)
    model.load_state_dict(torch.load(str(m_path), map_location=device))
    model.to(device)
    model.eval()

    all_preds = []
    all_targets = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy().tolist())
            all_targets.extend(labels.numpy().tolist())

    acc = accuracy_score(all_targets, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='weighted', zero_division=0)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='macro', zero_division=0)

    labels_idx = list(range(len(classes)))
    clf_report = classification_report(all_targets, all_preds, labels=labels_idx, target_names=classes, output_dict=True, zero_division=0)
    conf_matrix = confusion_matrix(all_targets, all_preds, labels=labels_idx).tolist()

    eval_results = {
        "overall_accuracy": round(float(acc), 4),
        "weighted_precision": round(float(precision), 4),
        "weighted_recall": round(float(recall), 4),
        "weighted_f1": round(float(f1), 4),
        "macro_f1": round(float(macro_f1), 4),
        "total_test_samples": len(test_items),
        "classes": classes,
        "classification_report": clf_report,
        "confusion_matrix": conf_matrix
    }

    out_path = ROOT_DIR / output_dir
    out_path.mkdir(parents=True, exist_ok=True)

    json_file = out_path / "model_evaluation_report.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(eval_results, f, indent=2)

    md_file = out_path / "model_evaluation_report.md"
    with open(md_file, "w", encoding="utf-8") as f:
        f.write("# FoodQualityAI — Real Model Evaluation Report\n\n")
        f.write(f"- **Test Set Size**: {len(test_items)} images\n")
        f.write(f"- **Overall Accuracy**: {acc*100:.2f}%\n")
        f.write(f"- **Weighted F1-Score**: {f1:.4f}\n")
        f.write(f"- **Weighted Precision**: {precision:.4f}\n")
        f.write(f"- **Weighted Recall**: {recall:.4f}\n\n")

        f.write("## 1. Per-Class Performance Breakdown\n\n")
        f.write("| Class Name | Precision | Recall | F1-Score | Support |\n")
        f.write("|---|---|---|---|---|\n")
        for cls_name in classes:
            metrics = clf_report.get(cls_name, {})
            p = metrics.get("precision", 0.0)
            r = metrics.get("recall", 0.0)
            f1_c = metrics.get("f1-score", 0.0)
            sup = metrics.get("support", 0)
            f.write(f"| `{cls_name}` | {p:.3f} | {r:.3f} | {f1_c:.3f} | {sup} |\n")

        f.write("\n## 2. Confusion Matrix (Row: True Class, Col: Predicted Class)\n\n")
        f.write("Matrix saved to `model_evaluation_report.json`.\n")

    print(f"Evaluation complete.")
    print(f"Accuracy: {acc*100:.2f}% | F1: {f1:.4f}")
    print(f"Saved to {json_file} and {md_file}")
    return eval_results

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-samples", type=int, default=None, help="Max test samples to evaluate")
    args = parser.parse_args()
    evaluate_model(max_eval_samples=args.max_samples)
