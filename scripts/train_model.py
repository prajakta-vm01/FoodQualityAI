"""
FoodQualityAI - Training Pipeline
Trains MobileNetV2 produce freshness classifier using real dataset splits.
Supports:
- Smoke-test mode (--smoke-test) for rapid verification with a balanced subset
- Full training mode with configurable epochs and batch sizes
- Validation after each epoch
- Model checkpointing to models/best_freshness_model.pt
- Training history and metrics recording to reports/training_history.json
- Model config export to models/model_config.json
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from PIL import Image

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from ml.model import build_model, get_transforms, DEFAULT_CLASSES

class ProduceDataset(Dataset):
    def __init__(self, items, root_dir, transform=None):
        self.items = items
        self.root_dir = Path(root_dir)
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        item = self.items[idx]
        img_path = self.root_dir / item["path"]
        try:
            image = Image.open(img_path).convert("RGB")
        except Exception:
            # Fallback to black dummy image if unreadable
            image = Image.new("RGB", (224, 224), (0, 0, 0))

        if self.transform:
            image = self.transform(image)

        label = item["label"]
        return image, label

def train_model(
    epochs: int = 5,
    batch_size: int = 32,
    lr: float = 0.001,
    smoke_test: bool = False,
    smoke_samples_per_class: int = 20,
    splits_path: str = "reports/dataset_splits.json",
    save_dir: str = "models",
    reports_dir: str = "reports"
):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"=== FoodQualityAI Training Starting ===")
    print(f"Target Device: {device}")
    print(f"Smoke Test Mode: {smoke_test}")

    # Load splits
    splits_file = ROOT_DIR / splits_path
    if not splits_file.exists():
        raise FileNotFoundError(f"Splits file {splits_file} not found. Run prepare_dataset.py first.")

    with open(splits_file, "r", encoding="utf-8") as f:
        splits_data = json.load(f)

    classes = splits_data["metadata"]["classes"]
    train_items = splits_data["train"]
    val_items = splits_data["val"]

    if smoke_test:
        print(f"[SMOKE TEST] Subsampling {smoke_samples_per_class} items per class for quick pipeline verification...")
        class_buckets = {cls_name: [] for cls_name in classes}
        for item in train_items:
            if len(class_buckets[item["class"]]) < smoke_samples_per_class:
                class_buckets[item["class"]].append(item)
        train_items = [item for b in class_buckets.values() for item in b]

        val_buckets = {cls_name: [] for cls_name in classes}
        for item in val_items:
            if len(val_buckets[item["class"]]) < max(5, smoke_samples_per_class // 4):
                val_buckets[item["class"]].append(item)
        val_items = [item for b in val_buckets.values() for item in b]

    print(f"Training dataset size: {len(train_items)}")
    print(f"Validation dataset size: {len(val_items)}")

    train_dataset = ProduceDataset(train_items, ROOT_DIR, transform=get_transforms(is_train=True))
    val_dataset = ProduceDataset(val_items, ROOT_DIR, transform=get_transforms(is_train=False))

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Initialize model with pretrained weights for real visual feature extraction
    model = build_model(num_classes=len(classes), pretrained=True)
    
    # Freeze lower convolutional feature layers to allow fast and stable transfer learning on CPU
    for param in model.features.parameters():
        param.requires_grad = False
    # Unfreeze the top block of features to adapt fine produce textures
    for param in model.features[-1].parameters():
        param.requires_grad = True

    model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam([p for p in model.parameters() if p.requires_grad], lr=lr)

    best_val_acc = 0.0
    history = {
        "train_loss": [],
        "train_acc": [],
        "val_loss": [],
        "val_acc": [],
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": lr,
        "device": str(device),
        "smoke_test": smoke_test
    }

    start_time = time.time()

    for epoch in range(1, epochs + 1):
        # Training Phase
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct_train += torch.sum(preds == labels.data).item()
            total_train += labels.size(0)

        epoch_train_loss = running_loss / max(1, total_train)
        epoch_train_acc = correct_train / max(1, total_train)

        # Validation Phase
        model.eval()
        val_loss = 0.0
        correct_val = 0
        total_val = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                correct_val += torch.sum(preds == labels.data).item()
                total_val += labels.size(0)

        epoch_val_loss = val_loss / max(1, total_val)
        epoch_val_acc = correct_val / max(1, total_val)

        history["train_loss"].append(round(epoch_train_loss, 4))
        history["train_acc"].append(round(epoch_train_acc, 4))
        history["val_loss"].append(round(epoch_val_loss, 4))
        history["val_acc"].append(round(epoch_val_acc, 4))

        print(f"Epoch {epoch}/{epochs} -> Train Loss: {epoch_train_loss:.4f}, Train Acc: {epoch_train_acc*100:.2f}% | Val Loss: {epoch_val_loss:.4f}, Val Acc: {epoch_val_acc*100:.2f}%")

        # Save Best Model Checkpoint
        save_path = ROOT_DIR / save_dir
        save_path.mkdir(parents=True, exist_ok=True)
        if epoch_val_acc >= best_val_acc or epoch == 1:
            best_val_acc = epoch_val_acc
            torch.save(model.state_dict(), str(save_path / "best_freshness_model.pt"))
            print(f"  --> Saved new best checkpoint with Val Acc: {best_val_acc*100:.2f}%")

    total_duration = time.time() - start_time
    history["total_duration_seconds"] = round(total_duration, 2)
    history["best_val_accuracy"] = round(best_val_acc, 4)

    # Save model config
    config_data = {
        "architecture": "MobileNetV2",
        "num_classes": len(classes),
        "classes": classes,
        "input_resolution": [224, 224, 3],
        "normalization": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225]
        },
        "trained_date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "best_val_accuracy": round(best_val_acc, 4),
        "smoke_test": smoke_test
    }
    with open(save_path / "model_config.json", "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2)

    # Save history
    rep_path = ROOT_DIR / reports_dir
    rep_path.mkdir(parents=True, exist_ok=True)
    with open(rep_path / "training_history.json", "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    print(f"\nTraining pipeline completed in {total_duration:.1f}s.")
    print(f"Best Validation Accuracy: {best_val_acc*100:.2f}%")
    print(f"Artifacts saved to {save_path}")
    return history

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FoodQualityAI Training Script")
    parser.add_argument("--epochs", type=int, default=5, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--smoke-test", action="store_true", help="Run rapid smoke test with subsampled dataset")
    args = parser.parse_args()

    train_model(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr, smoke_test=args.smoke_test)
