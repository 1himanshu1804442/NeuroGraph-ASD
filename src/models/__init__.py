"""
Neural network architectures for NeuroGraph-ASD.
Includes Graph Attention Network (GAT) branch, Phenotypic MLP branch, and multimodal fusion.
"""

try:
    from .gat_branch import GATBranch
    from .mlp_branch import PhenotypicMLP
    from .neurograph import NeuroGraphASD
except ImportError:
    # torch_geometric may not be installed in all environments
    GATBranch = None
    PhenotypicMLP = None
    NeuroGraphASD = None

try:
    from .facial_gcn import FacialGCN, build_canonical_68_edges, generate_gradcam_heatmap
except ImportError:
    FacialGCN = None
    build_canonical_68_edges = None
    generate_gradcam_heatmap = None

__all__ = [
    "GATBranch",
    "PhenotypicMLP",
    "NeuroGraphASD",
    "FacialGCN",
    "build_canonical_68_edges",
    "generate_gradcam_heatmap",
]


