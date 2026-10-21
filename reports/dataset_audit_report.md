# FoodQualityAI — Real Dataset Audit Report

- **Dataset Path**: `D:\FoodQualityAi\data`
- **Total Classes**: 12
- **Total Images Detected**: 14682
- **Valid Readable Images**: 14682
- **Corrupted Images**: 0
- **Exact Duplicates Detected**: 0
- **Class Imbalance Ratio (Max/Min)**: 7.16x

## 1. Class Distribution

| Class Name | Total Files | Valid Images | Corrupted | Primary Extension |
|---|---|---|---|---|
| `fresh_apple` | 1693 | 1693 | 0 | .png (1693) |
| `fresh_banana` | 1581 | 1581 | 0 | .png (1581) |
| `fresh_bitter_gourd` | 327 | 327 | 0 | .jpg (327) |
| `fresh_capsicum` | 990 | 990 | 0 | .jpg (990) |
| `fresh_orange` | 1466 | 1466 | 0 | .png (1466) |
| `fresh_tomato` | 981 | 981 | 0 | .jpg (981) |
| `stale_apple` | 2342 | 2342 | 0 | .png (2342) |
| `stale_banana` | 1467 | 1467 | 0 | .png (1467) |
| `stale_bitter_gourd` | 357 | 357 | 0 | .jpg (357) |
| `stale_capsicum` | 901 | 901 | 0 | .jpg (901) |
| `stale_orange` | 1595 | 1595 | 0 | .png (1595) |
| `stale_tomato` | 982 | 982 | 0 | .jpg (982) |

## 2. Produce Category Fresh vs. Stale Breakdown

| Produce Category | Fresh Count | Stale Count | Total Produce Images | Freshness Ratio |
|---|---|---|---|---|
| **Apple** | 1693 | 2342 | 4035 | 42.0% Fresh |
| **Banana** | 1581 | 1467 | 3048 | 51.9% Fresh |
| **Bitter_gourd** | 327 | 357 | 684 | 47.8% Fresh |
| **Capsicum** | 990 | 901 | 1891 | 52.4% Fresh |
| **Orange** | 1466 | 1595 | 3061 | 47.9% Fresh |
| **Tomato** | 981 | 982 | 1963 | 50.0% Fresh |

## 3. Data Integrity & Pipeline Recommendations

1. **Corrupted Images**: Zero unreadable files were detected if 0 corrupted. Validated image headers successfully.
2. **Format Uniformity**: Standardize all images to 224x224 RGB tensors during training.
3. **Split Strategy**: Stratified split into 80% Train, 10% Validation, 10% Test ensuring uniform class proportions.
