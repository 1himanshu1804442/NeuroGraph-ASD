"""
Tests for GNNExplainer, saliency mask extraction, and Connectome Visualizer.
"""

import numpy as np
import pytest
import torch
from torch_geometric.data import Data

from src.models.neurograph import NeuroGraphASD
from src.explainability.gnn_explainer import BrainXAIExplainer
from src.explainability.visualizer import ConnectomeVisualizer


@pytest.fixture
def sample_graph():
    num_nodes = 116
    num_edges = 200
    x = torch.randn(num_nodes, num_nodes)
    edge_index = torch.randint(0, num_nodes, (2, num_edges), dtype=torch.long)
    edge_attr = torch.rand(num_edges, 1)
    pheno = torch.tensor([[0.2, 0.4, 1.0]], dtype=torch.float32)
    y = torch.tensor([1], dtype=torch.long)
    return Data(x=x, edge_index=edge_index, edge_attr=edge_attr, phenotypic=pheno, y=y, num_nodes=num_nodes)


def test_brain_xai_explainer(sample_graph):
    """Verify explainer generates top edges and valid attribution percentages."""
    model = NeuroGraphASD(n_rois=116, gat_hidden=16, gat_out=16, pheno_in=3, pheno_out=8)
    explainer = BrainXAIExplainer(model=model, epochs=10, lr=0.05)

    result = explainer.explain_graph(sample_graph, top_k_edges=5)

    assert result.predicted_class in [0, 1]
    assert 0.0 <= result.confidence <= 1.0
    assert len(result.top_edges) <= 5
    assert len(result.top_nodes) > 0
    assert "Default Mode Network (DMN)" in result.network_attribution


def test_connectome_visualizer():
    """Verify 3D coordinate mapping and JSON graph export."""
    vis = ConnectomeVisualizer()
    dummy_fc = np.random.uniform(0.1, 0.8, size=(116, 116))
    graph_json = vis.export_graph_json(dummy_fc)

    assert "nodes" in graph_json
    assert "links" in graph_json
    assert len(graph_json["nodes"]) == 116
    assert len(graph_json["links"]) > 0
    assert "x" in graph_json["nodes"][0]
    assert "y" in graph_json["nodes"][0]
    assert "z" in graph_json["nodes"][0]
