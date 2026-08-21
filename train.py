"""
Training and cross-validation pipeline for NeuroGraph-ASD.
Implements Stratified K-Fold cross-validation, AdamW optimization, and model checkpointing.
"""

import argparse
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import StratifiedKFold
from torch_geometric.loader import DataLoader

from src.data_pipeline.abide_loader import ABIDELoader
from src.data_pipeline.graph_builder import BrainGraphBuilder
from src.models.neurograph import NeuroGraphASD
from src.utils.metrics import compute_clinical_metrics
from src.utils.logger import get_logger

logger = get_logger(__name__)


def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: torch.device
) -> float:
    """Trains the model for one full epoch."""
    model.train()
    total_loss = 0.0

    for batch in loader:
        batch = batch.to(device)
        optimizer.zero_grad()

        logits, _ = model(batch)
        loss = criterion(logits, batch.y)
        loss.backward()

        # Gradient clipping to prevent exploding gradients in deep GNNs
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
        optimizer.step()

        total_loss += loss.item() * batch.num_graphs

    return total_loss / len(loader.dataset)


def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device
) -> Tuple[float, Dict[str, float]]:
    """Evaluates the model on test/validation set and computes clinical diagnostic metrics."""
    model.eval()
    total_loss = 0.0
    all_preds: List[int] = []
    all_probs: List[float] = []
    all_targets: List[int] = []

    with torch.no_grad():
        for batch in loader:
            batch = batch.to(device)
            logits, _ = model(batch)
            loss = criterion(logits, batch.y)
            total_loss += loss.item() * batch.num_graphs

            probs = torch.softmax(logits, dim=-1)
            preds = torch.argmax(probs, dim=-1)

            all_preds.extend(preds.cpu().numpy().tolist())
            all_probs.extend(probs[:, 1].cpu().numpy().tolist())
            all_targets.extend(batch.y.cpu().numpy().tolist())

    avg_loss = total_loss / len(loader.dataset)
    metrics = compute_clinical_metrics(
        y_true=np.array(all_targets),
        y_pred=np.array(all_preds),
        y_prob=np.array(all_probs)
    )
    return avg_loss, metrics


def run_training(
    n_subjects: int = 120,
    epochs: int = 25,
    batch_size: int = 16,
    lr: float = 0.001,
    weight_decay: float = 1e-4,
    n_splits: int = 5,
    save_dir: str = "checkpoints"
):
    """
    Executes Stratified K-Fold Cross-Validation for NeuroGraph-ASD.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Starting NeuroGraph-ASD training on {device} (Epochs={epochs}, BatchSize={batch_size})")

    save_path = Path(save_dir)
    save_path.mkdir(parents=True, exist_ok=True)

    # 1. Load or Generate Dataset Cohort
    loader_service = ABIDELoader()
    pheno_df, fc_matrices = loader_service.load_cohort("ABIDE_I", n_subjects_if_generate=n_subjects)

    # 2. Build PyG Graphs
    graph_builder = BrainGraphBuilder(threshold_percentile=75.0, n_rois=116)
    dataset = graph_builder.build_dataset(pheno_df, fc_matrices)

    labels = [data.y.item() for data in dataset]
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)

    fold_results = []
    best_overall_auc = 0.0

    for fold, (train_idx, val_idx) in enumerate(skf.split(dataset, labels), 1):
        logger.info(f"\n--- Starting Fold {fold}/{n_splits} ---")
        train_subset = [dataset[i] for i in train_idx]
        val_subset = [dataset[i] for i in val_idx]

        train_loader = DataLoader(train_subset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_subset, batch_size=batch_size, shuffle=False)

        model = NeuroGraphASD(
            n_rois=116,
            gat_hidden=64,
            gat_out=64,
            heads1=4,
            heads2=2,
            pheno_in=3,
            pheno_out=32,
            dropout=0.25
        ).to(device)

        optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
        criterion = nn.CrossEntropyLoss()

        best_val_auc = 0.0

        for epoch in range(1, epochs + 1):
            train_loss = train_one_epoch(model, train_loader, optimizer, criterion, device)
            val_loss, val_metrics = evaluate(model, val_loader, criterion, device)
            scheduler.step()

            if epoch % 5 == 0 or epoch == epochs:
                logger.info(
                    f"Fold {fold} | Epoch {epoch:02d}/{epochs} | Train Loss: {train_loss:.4f} | "
                    f"Val Loss: {val_loss:.4f} | Val Acc: {val_metrics['accuracy']:.4f} | "
                    f"Val AUC: {val_metrics['auc_roc']:.4f}"
                )

            if val_metrics['auc_roc'] > best_val_auc:
                best_val_auc = val_metrics['auc_roc']
                # Save best fold model
                checkpoint_file = save_path / f"neurograph_fold_{fold}.pth"
                torch.save(model.state_dict(), checkpoint_file)

                if best_val_auc > best_overall_auc:
                    best_overall_auc = best_val_auc
                    best_model_file = save_path / "best_neurograph.pth"
                    torch.save(model.state_dict(), best_model_file)

        fold_results.append(best_val_auc)

    avg_auc = np.mean(fold_results)
    std_auc = np.std(fold_results)
    logger.info(f"\n Cross-Validation Complete. Mean AUC: {avg_auc:.4f} (+/- {std_auc:.4f})")
    return avg_auc


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train NeuroGraph-ASD Model")
    parser.add_argument("--subjects", type=int, default=60, help="Number of cohort subjects")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs per fold")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.002, help="Learning rate")
    args = parser.parse_args()

    run_training(
        n_subjects=args.subjects,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr
    )
