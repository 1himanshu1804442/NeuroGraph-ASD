"""
Cross-Domain Evaluation and Scanner Generalization Benchmark for NeuroGraph-ASD.
Validates model trained on ABIDE I against ABIDE II cohorts to assess scanner shift robustness.
"""

from pathlib import Path
import torch
import torch.nn as nn
from torch_geometric.loader import DataLoader

from src.data_pipeline.abide_loader import ABIDELoader
from src.data_pipeline.graph_builder import BrainGraphBuilder
from src.models.neurograph import NeuroGraphASD
from src.utils.metrics import compute_clinical_metrics
from src.utils.logger import get_logger

logger = get_logger(__name__)


def evaluate_cross_domain(checkpoint_path: str = "checkpoints/best_neurograph.pth"):
    """
    Loads a trained NeuroGraph-ASD checkpoint and evaluates cross-center generalization on ABIDE II.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Starting Cross-Domain Validation on {device} using checkpoint: {checkpoint_path}")

    # Load ABIDE II Test Cohort
    loader = ABIDELoader()
    pheno_df, fc_matrices = loader.load_cohort("ABIDE_II", n_subjects_if_generate=50)

    graph_builder = BrainGraphBuilder(threshold_percentile=75.0, n_rois=116)
    dataset = graph_builder.build_dataset(pheno_df, fc_matrices)
    test_loader = DataLoader(dataset, batch_size=16, shuffle=False)

    # Initialize model
    model = NeuroGraphASD(n_rois=116, gat_hidden=64, gat_out=64, pheno_in=3, pheno_out=32).to(device)

    chk_file = Path(checkpoint_path)
    if chk_file.exists():
        logger.info(f"Loading weights from {checkpoint_path}")
        model.load_state_dict(torch.load(chk_file, map_location=device))
    else:
        logger.warning("No checkpoint found. Running evaluation with initialized weights.")

    model.eval()
    all_preds = []
    all_probs = []
    all_targets = []

    with torch.no_grad():
        for batch in test_loader:
            batch = batch.to(device)
            logits, _ = model(batch)
            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)

            all_preds.extend(preds.cpu().numpy().tolist())
            all_probs.extend(probs[:, 1].cpu().numpy().tolist())
            all_targets.extend(batch.y.cpu().numpy().tolist())

    metrics = compute_clinical_metrics(
        y_true=torch.tensor(all_targets).numpy(),
        y_pred=torch.tensor(all_preds).numpy(),
        y_prob=torch.tensor(all_probs).numpy()
    )

    logger.info("=== Cross-Domain Evaluation (ABIDE II) Summary ===")
    logger.info(f"Accuracy:    {metrics['accuracy'] * 100:.2f}%")
    logger.info(f"Sensitivity: {metrics['sensitivity'] * 100:.2f}%")
    logger.info(f"Specificity: {metrics['specificity'] * 100:.2f}%")
    logger.info(f"AUC-ROC:     {metrics['auc_roc']:.4f}")
    return metrics


if __name__ == "__main__":
    evaluate_cross_domain()
