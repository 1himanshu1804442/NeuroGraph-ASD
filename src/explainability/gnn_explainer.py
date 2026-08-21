"""
Explainable AI (XAI) engine for NeuroGraph-ASD.
Generates edge saliency masks and identifies disrupted functional sub-networks (DMN, Salience, etc.).
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.data import Data

from src.data_pipeline.parcellation import AAL_KEY_REGIONS
from src.utils.logger import get_logger

logger = get_logger(__name__)


# Canonical AAL-116 Brain Region Labels
AAL_ALL_REGIONS: Dict[int, str] = {
    i: AAL_KEY_REGIONS.get(i, f"ROI_{i+1:03d}")
    for i in range(116)
}

# Anatomical Functional Sub-Networks
FUNCTIONAL_NETWORKS = {
    "Default Mode Network (DMN)": [23, 24, 35, 36, 67, 68],
    "Salience Network": [3, 4, 39, 40, 59, 60],
    "Frontoparietal / Executive": [7, 8, 25, 26, 61, 62],
    "Visual / Sensorimotor": [0, 1, 43, 44, 45, 46, 57, 58]
}


@dataclass
class SaliencyEdge:
    source_idx: int
    target_idx: int
    source_name: str
    target_name: str
    saliency_score: float
    functional_network: str


@dataclass
class ExplainerResult:
    predicted_class: int
    confidence: float
    top_edges: List[SaliencyEdge]
    top_nodes: List[Dict[str, Any]]
    network_attribution: Dict[str, float]


class BrainXAIExplainer:
    """
    Clinician-centric XAI engine based on GNNExplainer principles.
    Learns an edge mask that maximizes the mutual information with the diagnostic prediction.

    Why this method?
    - Instead of treating the deep neural network as an uninterpretable black box,
      the explainer highlights the exact functional connectivity edges responsible for the prediction.
    - Clinicians can verify if the model detected true neurobiological alterations
      (e.g., hypo-connectivity in the Default Mode Network).
    """

    def __init__(
        self,
        model: nn.Module,
        epochs: int = 60,
        lr: float = 0.01,
        sparsity_weight: float = 0.005,
        entropy_weight: float = 1.0
    ):
        self.model = model
        self.epochs = epochs
        self.lr = lr
        self.sparsity_weight = sparsity_weight
        self.entropy_weight = entropy_weight
        logger.info(f"Initialized BrainXAIExplainer (epochs={epochs}, lr={lr})")

    def _determine_network(self, u: int, v: int) -> str:
        """Determines which functional network a connection belongs to."""
        for net_name, rois in FUNCTIONAL_NETWORKS.items():
            if u in rois or v in rois:
                return net_name
        return "Subcortical / General Connectivity"

    def explain_graph(
        self,
        data: Data,
        target_class: Optional[int] = None,
        top_k_edges: int = 12
    ) -> ExplainerResult:
        """
        Optimizes an edge saliency mask for a patient's brain connectome.

        Args:
            data: Single PyG Data graph instance.
            target_class: Target class to explain (if None, uses model's predicted class).
            top_k_edges: Number of top salient functional edges to extract.

        Returns:
            ExplainerResult object containing top edges, node importances, and network attribution.
        """
        self.model.eval()

        # Get base prediction
        with torch.no_grad():
            logits, _ = self.model(data)
            probs = F.softmax(logits, dim=-1)
            pred_class = int(torch.argmax(probs, dim=-1).item())
            confidence = float(probs[0, pred_class].item())

        explain_class = pred_class if target_class is None else target_class
        num_edges = data.edge_index.size(1)

        # Initialize learnable edge mask in logit space
        edge_mask_param = nn.Parameter(torch.randn(num_edges, requires_grad=True) * 0.1)
        optimizer = torch.optim.Adam([edge_mask_param], lr=self.lr)

        # Optimization loop for GNNExplainer mask
        for epoch in range(self.epochs):
            optimizer.zero_grad()

            # Apply sigmoid to constrain mask to [0, 1]
            edge_mask = torch.sigmoid(edge_mask_param)

            # Masked node feature propagation
            # Scale edge attributes by edge mask
            original_edge_attr = getattr(data, "edge_attr", None)
            if original_edge_attr is not None:
                masked_edge_attr = original_edge_attr * edge_mask.unsqueeze(1)
            else:
                masked_edge_attr = edge_mask.unsqueeze(1)

            # Create temporary masked Data object
            masked_data = Data(
                x=data.x,
                edge_index=data.edge_index,
                edge_attr=masked_edge_attr,
                phenotypic=getattr(data, "phenotypic", None),
                batch=getattr(data, "batch", None)
            )

            # Compute masked logits
            masked_logits, _ = self.model(masked_data)
            masked_log_probs = F.log_softmax(masked_logits, dim=-1)

            # Loss: Maximize mutual info with target class + Sparsity + Low Entropy
            pred_loss = -masked_log_probs[0, explain_class]
            sparsity_loss = self.sparsity_weight * torch.sum(edge_mask)
            entropy = -edge_mask * torch.log(edge_mask + 1e-8) - (1 - edge_mask) * torch.log(1 - edge_mask + 1e-8)
            entropy_loss = self.entropy_weight * torch.mean(entropy)

            loss = pred_loss + sparsity_loss + entropy_loss
            loss.backward()
            optimizer.step()

        # Extract final saliency weights
        final_mask = torch.sigmoid(edge_mask_param).detach().cpu().numpy()

        # Sort edges by saliency score
        top_edge_indices = np.argsort(final_mask)[::-1][:top_k_edges]

        edge_index_np = data.edge_index.cpu().numpy()
        top_edges: List[SaliencyEdge] = []
        network_scores: Dict[str, float] = {k: 0.0 for k in FUNCTIONAL_NETWORKS.keys()}
        network_scores["Subcortical / General Connectivity"] = 0.0

        node_saliency_accumulator = np.zeros(data.num_nodes, dtype=float)

        for edge_idx in top_edge_indices:
            u = int(edge_index_np[0, edge_idx])
            v = int(edge_index_np[1, edge_idx])
            score = float(final_mask[edge_idx])

            u_name = AAL_ALL_REGIONS.get(u, f"ROI_{u+1}")
            v_name = AAL_ALL_REGIONS.get(v, f"ROI_{v+1}")
            net_name = self._determine_network(u, v)

            network_scores[net_name] += score
            node_saliency_accumulator[u] += score
            node_saliency_accumulator[v] += score

            top_edges.append(SaliencyEdge(
                source_idx=u,
                target_idx=v,
                source_name=u_name,
                target_name=v_name,
                saliency_score=score,
                functional_network=net_name
            ))

        # Top salient ROIs / brain lobes
        top_node_indices = np.argsort(node_saliency_accumulator)[::-1][:8]
        top_nodes = [
            {
                "roi_index": int(roi_idx),
                "name": AAL_ALL_REGIONS.get(int(roi_idx), f"ROI_{roi_idx+1}"),
                "importance": float(node_saliency_accumulator[roi_idx])
            }
            for roi_idx in top_node_indices
            if node_saliency_accumulator[roi_idx] > 0
        ]

        # Normalize network attribution percentages
        total_score = sum(network_scores.values()) + 1e-8
        normalized_network_attribution = {
            k: round(float((v / total_score) * 100), 2)
            for k, v in network_scores.items()
        }

        logger.info(
            f"Explainability generated for subject: Predicted={explain_class} "
            f"({confidence*100:.1f}%), Top Edge Saliency={top_edges[0].saliency_score:.3f}"
        )

        return ExplainerResult(
            predicted_class=explain_class,
            confidence=confidence,
            top_edges=top_edges,
            top_nodes=top_nodes,
            network_attribution=normalized_network_attribution
        )
