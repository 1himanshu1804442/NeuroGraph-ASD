"""
Tests for brain parcellation, FC computation, and PyG graph construction.
"""

import numpy as np
import pytest
import torch

from src.data_pipeline.parcellation import (
    ParcellationService,
    compute_functional_connectivity,
    AAL116_ROI_COUNT
)
from src.data_pipeline.graph_builder import BrainGraphBuilder


def test_compute_functional_connectivity():
    """Verify FC matrix properties: symmetric, zero-diagonal, proper shape."""
    timepoints = 100
    n_rois = 116
    synthetic_ts = np.random.normal(0, 1, size=(timepoints, n_rois))

    fc = compute_functional_connectivity(synthetic_ts, apply_fisher_z=True, zero_diagonal=True)

    assert fc.shape == (n_rois, n_rois)
    # Check symmetry
    np.testing.assert_allclose(fc, fc.T, atol=1e-5)
    # Check zero diagonal
    np.testing.assert_allclose(np.diag(fc), 0.0)
    # Check values are finite
    assert np.all(np.isfinite(fc))


def test_threshold_connectivity():
    """Verify thresholding preserves top percentile connections."""
    service = ParcellationService(n_rois=116)
    dummy_fc = np.random.uniform(-0.5, 0.9, size=(116, 116))
    dummy_fc = (dummy_fc + dummy_fc.T) / 2.0
    np.fill_diagonal(dummy_fc, 0.0)

    bin_adj, weight_adj = service.threshold_connectivity(dummy_fc, threshold_percentile=80.0)

    assert bin_adj.shape == (116, 116)
    assert weight_adj.shape == (116, 116)
    assert np.all(np.isin(bin_adj, [0, 1]))
    assert np.all(np.diag(bin_adj) == 0)


def test_brain_graph_builder():
    """Verify conversion of FC matrix and phenotypic vector into PyG Data object."""
    builder = BrainGraphBuilder(threshold_percentile=75.0, n_rois=116)
    dummy_fc = np.random.uniform(0.1, 0.8, size=(116, 116))
    dummy_fc = (dummy_fc + dummy_fc.T) / 2.0
    np.fill_diagonal(dummy_fc, 0.0)

    pheno_vec = torch.tensor([0.25, 0.50, 1.0], dtype=torch.float32)
    graph_data = builder.matrix_to_graph_data(
        fc_matrix=dummy_fc,
        phenotypic_vector=pheno_vec,
        label=1,
        subject_id="TEST_001",
        site_id="TEST_SITE"
    )

    assert graph_data.num_nodes == 116
    assert graph_data.x.shape == (116, 116)
    assert graph_data.edge_index.dim() == 2
    assert graph_data.edge_index.size(0) == 2
    assert graph_data.edge_attr.dim() == 2
    assert graph_data.y.item() == 1
    assert graph_data.subject_id == "TEST_001"
