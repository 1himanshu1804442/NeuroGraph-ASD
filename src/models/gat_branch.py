"""
Graph Attention Network (GAT) branch for learning topological connectome embeddings.
Utilizes multi-head self-attention mechanisms to weigh functional neural pathways.
"""

from typing import Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv, global_mean_pool, global_max_pool
from src.utils.logger import get_logger

logger = get_logger(__name__)


class GATBranch(nn.Module):
    """
    Multi-Layer Graph Attention Network for brain connectome graphs.

    Architecture:
    - Layer 1: GATConv with K1 attention heads, extracting multi-view ROI representations.
    - Layer 2: GATConv with K2 attention heads, refining topological correlations.
    - Readout: Dual Global Pooling (Mean + Max pooling concatenated) for graph-level embedding.

    Why this architecture?
    - GAT learns attention weights alpha_ij dynamically, allowing the network to highlight
      altered functional synchrony between specific brain lobes without manual feature engineering.
    - Combining global mean and max pooling captures both overall connectivity trends and peak
      regional activations.
    """

    def __init__(
        self,
        in_channels: int = 116,
        hidden_channels: int = 64,
        out_channels: int = 64,
        heads_layer1: int = 4,
        heads_layer2: int = 2,
        dropout: float = 0.25
    ):
        super(GATBranch, self).__init__()
        self.dropout = dropout

        # First GAT layer with multi-head attention (output dim: hidden_channels * heads_layer1)
        self.gat1 = GATConv(
            in_channels=in_channels,
            out_channels=hidden_channels,
            heads=heads_layer1,
            concat=True,
            dropout=dropout
        )
        self.bn1 = nn.BatchNorm1d(hidden_channels * heads_layer1)

        # Second GAT layer (output dim: out_channels * heads_layer2)
        self.gat2 = GATConv(
            in_channels=hidden_channels * heads_layer1,
            out_channels=out_channels,
            heads=heads_layer2,
            concat=True,
            dropout=dropout
        )
        self.bn2 = nn.BatchNorm1d(out_channels * heads_layer2)

        # Final projection layer to map pooled graph features
        pooled_dim = (out_channels * heads_layer2) * 2  # Mean + Max concatenated
        self.fc_graph = nn.Sequential(
            nn.Linear(pooled_dim, out_channels),
            nn.BatchNorm1d(out_channels),
            nn.ELU(),
            nn.Dropout(p=dropout)
        )

        logger.info(
            f"GATBranch built: in={in_channels}, hidden={hidden_channels} (x{heads_layer1} heads), "
            f"out={out_channels} (x{heads_layer2} heads), pooled_dim={pooled_dim}"
        )

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        edge_attr: Optional[torch.Tensor] = None,
        batch: Optional[torch.Tensor] = None,
        return_attention_weights: bool = False
    ) -> Tuple[torch.Tensor, Optional[Tuple[torch.Tensor, torch.Tensor]]]:
        """
        Forward pass of GAT branch.

        Args:
            x: Node features [num_nodes, in_channels] (116-dim FC profile).
            edge_index: Graph edge indices [2, num_edges].
            edge_attr: Optional edge weights.
            batch: Batch assignment vector [num_nodes]. If None, all nodes belong to 1 graph.
            return_attention_weights: If True, returns attention weights from the first GAT layer.

        Returns:
            Tuple of (graph_embedding [batch_size, out_channels], optional_attention_weights).
        """
        if batch is None:
            batch = torch.zeros(x.size(0), dtype=torch.long, device=x.device)

        # Layer 1: Message passing with Multi-Head Attention
        att_weights = None
        if return_attention_weights:
            x_res, (edge_index_att, alpha) = self.gat1(
                x, edge_index, return_attention_weights=True
            )
            att_weights = (edge_index_att, alpha)
        else:
            x_res = self.gat1(x, edge_index)

        x = self.bn1(x_res)
        x = F.elu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Layer 2: Second GAT representation
        x = self.gat2(x, edge_index)
        x = self.bn2(x)
        x = F.elu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Graph-level Readout: Concatenate Global Mean and Global Max Pooling
        mean_pool = global_mean_pool(x, batch)
        max_pool = global_max_pool(x, batch)
        pooled = torch.cat([mean_pool, max_pool], dim=1)

        # Project to target graph embedding dimension
        graph_embedding = self.fc_graph(pooled)

        return graph_embedding, att_weights
