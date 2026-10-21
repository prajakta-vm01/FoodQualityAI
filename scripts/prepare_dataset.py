"""
FoodQualityAI - Dataset Preparation Pipeline
Creates reproducible, stratified train/val/test splits without copying or modifying original data.
Outputs split metadata to reports/dataset_splits.json.
Also provides a balanced sampling utility for rapid smoke-testing and training.
"""

import os
import json
import random
from pathlib import Path
from collections import defaultdict
from sklearn.model_selection import train_test_split

def prepare_dataset_splits(
    data_dir: str = "data",
    output_path: str = "reports/dataset_splits.json",
    train_ratio: float = 0.8,
    val_ratio: float = 0.1,
    test_ratio: float = 0.1,
    seed: int = 42
):
    random.seed(seed)
    data_path = Path(data_dir).resolve()
    if not data_path.exists():
        raise FileNotFoundError(f"Data directory {data_path} not found.")

    classes = sorted([d.name for d in data_path.iterdir() if d.is_dir()])
    
    splits = {
        "metadata": {
            "train_ratio": train_ratio,
            "val_ratio": val_ratio,
            "test_ratio": test_ratio,
            "random_seed": seed,
            "classes": classes,
            "class_to_idx": {cls: i for i, cls in enumerate(classes)},
            "idx_to_class": {i: cls for i, cls in enumerate(classes)}
        },
        "train": [],
        "val": [],
        "test": []
    }

    per_class_summary = {}

    for cname in classes:
        folder = data_path / cname
        files = [str(f.relative_to(data_path.parent).as_posix()) for f in folder.iterdir() if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png']]
        files.sort() # Ensure deterministic order before shuffle
        random.shuffle(files)

        n_total = len(files)
        n_train = int(n_total * train_ratio)
        n_val = int(n_total * val_ratio)
        # Remaining goes to test to guarantee all files are accounted for
        train_files = files[:n_train]
        val_files = files[n_train:n_train + n_val]
        test_files = files[n_train + n_val:]

        splits["train"].extend([{"path": p, "class": cname, "label": splits["metadata"]["class_to_idx"][cname]} for p in train_files])
        splits["val"].extend([{"path": p, "class": cname, "label": splits["metadata"]["class_to_idx"][cname]} for p in val_files])
        splits["test"].extend([{"path": p, "class": cname, "label": splits["metadata"]["class_to_idx"][cname]} for p in test_files])

        per_class_summary[cname] = {
            "total": n_total,
            "train": len(train_files),
            "val": len(val_files),
            "test": len(test_files)
        }

    splits["metadata"]["per_class_summary"] = per_class_summary
    splits["metadata"]["total_train"] = len(splits["train"])
    splits["metadata"]["total_val"] = len(splits["val"])
    splits["metadata"]["total_test"] = len(splits["test"])

    out_file = Path(output_path).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(splits, f, indent=2)

    print("Dataset preparation complete.")
    print(f"Total Train: {len(splits['train'])}")
    print(f"Total Val:   {len(splits['val'])}")
    print(f"Total Test:  {len(splits['test'])}")
    print(f"Split file saved to: {out_file}")
    return splits

if __name__ == "__main__":
    prepare_dataset_splits()
