"""
FoodQualityAI - ML Architecture & Inference Engine
Defines the CNN model architecture (transfer learning with MobileNetV2 or customized lightweight CNN),
inference pipelines, preprocessing transforms, and freshness interpretation.
"""

import os
import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

# Supported 12 classes from real dataset
DEFAULT_CLASSES = [
    "fresh_apple",
    "fresh_banana",
    "fresh_bitter_gourd",
    "fresh_capsicum",
    "fresh_orange",
    "fresh_tomato",
    "stale_apple",
    "stale_banana",
    "stale_bitter_gourd",
    "stale_capsicum",
    "stale_orange",
    "stale_tomato"
]

def get_transforms(is_train: bool = False):
    """Image transforms standardizing input to 224x224 RGB tensors with ImageNet normalization"""
    if is_train:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    else:
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

def build_model(num_classes: int = 12, pretrained: bool = False) -> nn.Module:
    """
    Builds a MobileNetV2 architecture with a custom classification head for 12 produce freshness classes.
    Lightweight, fast CPU/GPU inference, well-suited for industrial edge/embedded or server deployment.
    """
    if pretrained:
        weights = models.MobileNet_V2_Weights.DEFAULT
        model = models.mobilenet_v2(weights=weights)
    else:
        model = models.mobilenet_v2(weights=None)

    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, 128),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(128, num_classes)
    )
    return model

class FreshnessClassifier:
    """Loads a trained model artifact and performs single/batch inference with confidence scores."""
    
    def __init__(self, model_path: Optional[str] = None, config_path: Optional[str] = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.classes = DEFAULT_CLASSES
        self.is_trained = False
        self.model_info = {}
        self.transform = get_transforms(is_train=False)

        # Default paths if not specified
        base_dir = Path(__file__).resolve().parent.parent
        self.model_path = Path(model_path) if model_path else (base_dir / "models" / "best_freshness_model.pt")
        self.config_path = Path(config_path) if config_path else (base_dir / "models" / "model_config.json")

        self.load_model()

    def load_model(self):
        """Loads weights and metadata if available, otherwise marks model as UNTRAINED."""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    self.model_info = json.load(f)
                    self.classes = self.model_info.get("classes", DEFAULT_CLASSES)
            except Exception as e:
                print(f"Warning reading model config: {e}")

        if self.model_path.exists():
            try:
                self.model = build_model(num_classes=len(self.classes), pretrained=False)
                state_dict = torch.load(str(self.model_path), map_location=self.device)
                self.model.load_state_dict(state_dict)
                self.model.to(self.device)
                self.model.eval()
                self.is_trained = True
                print(f"[ML] Successfully loaded model from {self.model_path} onto {self.device}")
            except Exception as e:
                print(f"[ML] Error loading model weights: {e}")
                self.is_trained = False
                self.model = None
        else:
            self.is_trained = False
            self.model = None
            print(f"[ML] No trained model weights found at {self.model_path}. State: UNTRAINED")

    def predict_image(self, image: Image.Image) -> Dict[str, Any]:
        """
        Runs inference on a PIL Image.
        Returns:
            - predicted_class: e.g. "fresh_apple"
            - condition: "fresh" or "stale"
            - produce_type: "apple", "banana", "tomato", etc.
            - confidence: float 0.0 to 1.0
            - probabilities: dict of all class probabilities
            - is_trained: bool
        """
        if not self.is_trained or self.model is None:
            return {
                "is_trained": False,
                "error": "Model is UNTRAINED. Genuine model weights not loaded.",
                "predicted_class": "Model Untrained",
                "condition": "unknown",
                "produce_type": "unknown",
                "confidence": 0.0,
                "probabilities": {}
            }

        if image.mode != "RGB":
            image = image.convert("RGB")

        tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            outputs = self.model(tensor)
            probs = torch.softmax(outputs, dim=1)[0].cpu().numpy()

        pred_idx = int(probs.argmax())
        pred_class = self.classes[pred_idx]
        confidence = float(probs[pred_idx])

        # Parse condition and produce type
        is_fresh = pred_class.startswith("fresh_")
        condition = "fresh" if is_fresh else "stale"
        produce_type = pred_class.replace("fresh_", "").replace("stale_", "")

        class_probs = {cls_name: float(p) for cls_name, p in zip(self.classes, probs)}

        return {
            "is_trained": True,
            "predicted_class": pred_class,
            "condition": condition,
            "produce_type": produce_type,
            "confidence": round(confidence, 4),
            "probabilities": class_probs
        }
