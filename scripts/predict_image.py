"""
FoodQualityAI - Standalone Prediction Script
Runs inference on a single image file or directory of images.
Prints prediction, confidence, and explainable food quality score.
"""

import sys
import argparse
from pathlib import Path
from PIL import Image

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT_DIR))

from ml.model import FreshnessClassifier

def predict_single_image(image_path: str):
    classifier = FreshnessClassifier()
    img_path = Path(image_path)
    if not img_path.exists():
        print(f"Error: File {image_path} does not exist.")
        return

    try:
        img = Image.open(img_path)
    except Exception as e:
        print(f"Error reading image: {e}")
        return

    result = classifier.predict_image(img)
    print("--------------------------------------------------")
    print(f"Image:            {img_path.name}")
    print(f"Model Status:     {'TRAINED' if result['is_trained'] else 'UNTRAINED'}")
    print(f"Predicted Class:  {result['predicted_class']}")
    print(f"Condition:        {result['condition'].upper()}")
    print(f"Produce Type:     {result['produce_type']}")
    print(f"Confidence:       {result['confidence']*100:.2f}%")
    print("--------------------------------------------------")
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FoodQualityAI Predict Image")
    parser.add_argument("image_path", type=str, help="Path to image file")
    args = parser.parse_args()
    predict_single_image(args.image_path)
