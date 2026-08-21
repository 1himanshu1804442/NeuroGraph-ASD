"""
Tests for GATBranch, PhenotypicMLP, and NeuroGraphASD model forward and backward passes.
"""

import pytest
import torch
from torch_geometric.data import Data, Batch

from src.models.gat_branch import GATBranch
from src.models.mlp_branch import PhenotypicMLP
from src.models.neurograph import NeuroGraphASD


@pytest.fixture
def sample_graph_data():
    """Creates a synthetic PyG Data graph."""
    num_nodes = 116
    num_edges = 300
    x = torch.randn(num_nodes, num_nodes)
    edge_index = torch.randint(0, num_nodes, (2, num_edges), dtype=torch.long)
    edge_attr = torch.rand(num_edges, 1)
    pheno = torch.tensor([[0.5, -0.2, 1.0]], dtype=torch.float32)
    y = torch.tensor([1], dtype=torch.long)

    return Data(x=x, edge_index=edge_index, edge_attr=edge_attr, phenotypic=pheno, y=y, num_nodes=num_nodes)


def test_gat_branch_forward(sample_graph_data):
    """Verify GATBranch produces expected embedding dimensions."""
    gat = GATBranch(in_channels=116, hidden_channels=32, out_channels=32, heads_layer1=2, heads_layer2=2)
    embed, att = gat(sample_graph_data.x, sample_graph_data.edge_index, return_attention_weights=True)

    assert embed.shape == (1, 32)
    assert att is not None
    assert att[0].size(0) == 2


def test_phenotypic_mlp_forward():
    """Verify PhenotypicMLP transforms demographic inputs."""
    mlp = PhenotypicMLP(in_features=3, hidden_dim=16, out_dim=16)
    pheno_tensor = torch.randn(4, 3)
    out = mlp(pheno_tensor)

    assert out.shape == (4, 16)


def test_neurograph_multimodal_forward_and_backward(sample_graph_data):
    """Verify multimodal fusion model end-to-end forward computation and gradient updates."""
    model = NeuroGraphASD(n_rois=116, gat_hidden=32, gat_out=32, pheno_in=3, pheno_out=16)
    logits, _ = model(sample_graph_data)

    assert logits.shape == (1, 2)

    # Test backward pass
    loss_fn = torch.nn.CrossEntropyLoss()
    loss = loss_fn(logits, sample_graph_data.y)
    loss.backward()

    for param in model.parameters():
        if param.requires_grad:
            assert param.grad is not None


def test_neurograph_batched_forward(sample_graph_data):
    """Verify batched graph inference with Batch container."""
    data2 = sample_graph_data.clone()
    batch = Batch.from_data_list([sample_graph_data, data2])

    model = NeuroGraphASD(n_rois=116, gat_hidden=32, gat_out=32, pheno_in=3, pheno_out=16)
    probs = model.predict_proba(batch)

    assert probs.shape == (2, 2)
    # Ensure row probabilities sum to 1
    torch.testing.assert_close(torch.sum(probs, dim=1), torch.ones(2))
