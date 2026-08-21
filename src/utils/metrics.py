"""
Metrics calculation module for evaluating binary classification in clinical ASD detection.
"""

from typing import Dict, Any
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)
from src.utils.logger import get_logger

logger = get_logger(__name__)


def compute_clinical_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: np.ndarray
) -> Dict[str, float]:
    """
    Computes comprehensive diagnostic metrics:
      - Accuracy: Overall correct classifications
      - Sensitivity / Recall: True Positive Rate (identifying ASD patients)
      - Specificity: True Negative Rate (correctly identifying typical controls)
      - Precision: Positive Predictive Value
      - F1 Score: Harmonic mean of precision and sensitivity
      - AUC-ROC: Area Under Receiver Operating Characteristic Curve

    Args:
        y_true: Ground truth binary labels (0 = Control, 1 = ASD).
        y_pred: Predicted discrete class labels (0 or 1).
        y_prob: Predicted probability score for ASD class (class 1).

    Returns:
        Dictionary mapping metric names to floating point values.
    """
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    sens = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    # Compute Specificity from Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    # Compute AUC-ROC if both classes are present
    try:
        if len(np.unique(y_true)) > 1:
            auc = float(roc_auc_score(y_true, y_prob))
        else:
            auc = 0.5
    except Exception as e:
        logger.warning(f"Failed to calculate AUC-ROC: {e}")
        auc = 0.5

    metrics = {
        "accuracy": acc,
        "sensitivity": sens,
        "specificity": spec,
        "precision": prec,
        "f1_score": f1,
        "auc_roc": auc,
        "true_positives": int(tp),
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn)
    }

    logger.info(
        f"Computed Metrics -> Acc: {acc:.4f}, Sens: {sens:.4f}, Spec: {spec:.4f}, "
        f"F1: {f1:.4f}, AUC: {auc:.4f}"
    )
    return metrics
