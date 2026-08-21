"""
Phenotypic Multi-Layer Perceptron (MLP) branch for embedding patient demographic metadata.
Processes clinical variables (Age at scan, Sex, Full-Scale IQ) into latent representations.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from src.utils.logger import get_logger

logger = get_logger(__name__)


class PhenotypicMLP(nn.Module):
    """
    Multi-Layer Perceptron for encoding patient demographic/clinical features.

    Why this architecture?
    - Phenotypic variables like Age, Sex, and IQ have strong statistical associations
      with neurodevelopmental milestones.
    - Transforming low-dimensional tabular data into a dense continuous embedding space
      allows smooth cross-modal fusion with high-dimensional connectome graph embeddings.
    """

    def __init__(
        self,
        in_features: int = 3,
        hidden_dim: int = 32,
        out_dim: int = 32,
        dropout: float = 0.20
    ):
        super(PhenotypicMLP, self).__init__()
        self.dropout = dropout

        self.fc1 = nn.Linear(in_features, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)

        self.fc2 = nn.Linear(hidden_dim, out_dim)
        self.bn2 = nn.BatchNorm1d(out_dim)

        logger.info(f"PhenotypicMLP built: in={in_features} -> hidden={hidden_dim} -> out={out_dim}")

    def forward(self, x_pheno: torch.Tensor) -> torch.Tensor:
        """
        Forward pass for phenotypic MLP.

        Args:
            x_pheno: Demographic feature tensor [batch_size, in_features]

        Returns:
            Latent embedding tensor [batch_size, out_dim]
        """
        # Ensure 2D tensor
        if x_pheno.dim() == 1:
            x_pheno = x_pheno.unsqueeze(0)

        # First hidden projection
        h = self.fc1(x_pheno)
        # Apply BatchNorm only if batch_size > 1 to avoid single-sample eval crashes
        if h.size(0) > 1:
            h = self.bn1(h)
        h = F.relu(h)
        h = F.dropout(h, p=self.dropout, training=self.training)

        # Second projection
        out = self.fc2(h)
        if out.size(0) > 1:
            out = self.bn2(out)
        out = F.relu(out)

        return out
