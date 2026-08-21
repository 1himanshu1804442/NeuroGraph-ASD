"""
NeuroGraph-ASD Multimodal Fusion Architecture.
Unifies Graph Attention Network (connectome branch) and Phenotypic MLP (clinical branch)
for explainable Autism Spectrum Disorder detection.
"""

from typing import Dict, Optional, Tuple, Any
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data, Batch

from src.models.gat_branch import GATBranch
from src.models.mlp_branch import PhenotypicMLP
from src.utils.logger import get_logger

logger = get_logger(__name__)


class NeuroGraphASD(nn.Module):
    """
    Multimodal Dual-Branch Graph Neural Network for ASD Diagnosis.

    Why this dual-branch design?
    1. Unimodal models either focus exclusively on brain connectomes (ignoring patient demographics)
       or exclusively on tabular phenotypic data (missing brain network topological insights).
    2. NeuroGraph-ASD combines high-dimensional topological connectome representations
       with patient clinical factors (Age, Sex, Full Scale IQ).
    3. The late-fusion design preserves the distinct geometric and tabular representations
       before joint decision modeling.
    """

    def __init__(
        self,
        n_rois: int = 116,
        gat_hidden: int = 64,
        gat_out: int = 64,
        heads1: int = 4,
        heads2: int = 2,
        pheno_in: int = 3,
        pheno_out: int = 32,
        classifier_hidden: int = 64,
        num_classes: int = 2,
        dropout: float = 0.25
    ):
        super(NeuroGraphASD, self).__init__()
        self.num_classes = num_classes

        # Branch 1: Graph Attention Network Connectome Branch
        self.gat_branch = GATBranch(
            in_channels=n_rois,
            hidden_channels=gat_hidden,
            out_channels=gat_out,
            heads_layer1=heads1,
            heads_layer2=heads2,
            dropout=dropout
        )

        # Branch 2: Phenotypic Demographic MLP Branch
        self.pheno_branch = PhenotypicMLP(
            in_features=pheno_in,
            hidden_dim=pheno_out,
            out_dim=pheno_out,
            dropout=dropout
        )

        # Fusion & Classification Head
        fused_dim = gat_out + pheno_out
        self.classifier = nn.Sequential(
            nn.Linear(fused_dim, classifier_hidden),
            nn.LayerNorm(classifier_hidden),
            nn.LeakyReLU(negative_slope=0.1),
            nn.Dropout(p=dropout),
            nn.Linear(classifier_hidden, classifier_hidden // 2),
            nn.LeakyReLU(negative_slope=0.1),
            nn.Linear(classifier_hidden // 2, num_classes)
        )

        logger.info(
            f"NeuroGraphASD constructed: GAT({gat_out}) + Pheno({pheno_out}) -> "
            f"Fused({fused_dim}) -> Classifier -> {num_classes} classes."
        )

    def forward(
        self,
        data: Any,
        return_attention: bool = False
    ) -> Tuple[torch.Tensor, Optional[Tuple[torch.Tensor, torch.Tensor]]]:
        """
        Forward computation across both branches.

        Args:
            data: PyG Data or Batch instance containing x, edge_index, phenotypic, batch.
            return_attention: If True, returns attention weights from GAT layer 1.

        Returns:
            Tuple of (logits [batch_size, 2], optional_attention_weights).
        """
        x = data.x
        edge_index = data.edge_index
        edge_attr = getattr(data, "edge_attr", None)
        batch = getattr(data, "batch", None)
        pheno = getattr(data, "phenotypic", None)

        # 1. Process Connectome Graph via GAT
        graph_embed, att_weights = self.gat_branch(
            x=x,
            edge_index=edge_index,
            edge_attr=edge_attr,
            batch=batch,
            return_attention_weights=return_attention
        )

        # 2. Process Demographic Variables via MLP
        if pheno is not None:
            # Handle shape mismatch if phenotypic is [batch_size, 1, 3]
            if pheno.dim() == 3:
                pheno = pheno.squeeze(1)
            pheno_embed = self.pheno_branch(pheno)
        else:
            # Fallback zero phenotypic embedding if missing
            batch_size = graph_embed.size(0)
            pheno_embed = torch.zeros(
                (batch_size, self.pheno_branch.fc2.out_features),
                device=graph_embed.device
            )

        # 3. Multimodal Cross-Modal Fusion
        fused_features = torch.cat([graph_embed, pheno_embed], dim=1)

        # 4. Diagnostic Classification Head
        logits = self.classifier(fused_features)

        return logits, att_weights

    def predict_proba(self, data: Any) -> torch.Tensor:
        """
        Inference helper: Computes Softmax probability distribution [batch_size, 2].
        Index 0: Control Probability, Index 1: ASD Probability.
        """
        self.eval()
        with torch.no_grad():
            logits, _ = self.forward(data)
            probabilities = F.softmax(logits, dim=-1)
        return probabilities
