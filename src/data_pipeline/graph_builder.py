"""
PyTorch Geometric Brain Graph constructor.
Transforms functional connectivity matrices and clinical metadata into PyG Data objects.
"""

from typing import List, Tuple, Optional
import numpy as np
import pandas as pd
import torch
from torch_geometric.data import Data
from torch_geometric.loader import DataLoader
from sklearn.preprocessing import StandardScaler

from src.data_pipeline.parcellation import ParcellationService
from src.utils.logger import get_logger

logger = get_logger(__name__)


class BrainGraphBuilder:
    """
    Constructs PyTorch Geometric Data graph instances from subject FC matrices
    and normalized phenotypic demographic features.
    """

    def __init__(
        self,
        threshold_percentile: float = 75.0,
        n_rois: int = 116
    ):
        self.threshold_percentile = threshold_percentile
        self.n_rois = n_rois
        self.parcellation_service = ParcellationService(n_rois=n_rois)
        self.phenotypic_scaler = StandardScaler()
        self._is_scaler_fitted = False
        logger.info(f"Initialized BrainGraphBuilder with threshold {threshold_percentile}% on {n_rois} ROIs")

    def fit_phenotypic_scaler(self, pheno_df: pd.DataFrame) -> None:
        """
        Fits standard scaler on continuous phenotypic features (AGE_AT_SCAN, FIQ).
        """
        features = pheno_df[["AGE_AT_SCAN", "FIQ"]].values
        self.phenotypic_scaler.fit(features)
        self._is_scaler_fitted = True
        logger.info("Fitted phenotypic standard scaler on age and FIQ.")

    def transform_phenotypic_features(self, pheno_row: pd.Series) -> torch.Tensor:
        """
        Extracts and normalizes patient phenotypic vector: [Scaled_Age, Scaled_FIQ, Sex_Binary].

        Returns:
            1D float Tensor of shape (3,).
        """
        age = float(pheno_row["AGE_AT_SCAN"])
        fiq = float(pheno_row["FIQ"])
        sex = float(pheno_row["SEX"])

        if self._is_scaler_fitted:
            scaled_cont = self.phenotypic_scaler.transform([[age, fiq]])[0]
            scaled_age, scaled_fiq = scaled_cont[0], scaled_cont[1]
        else:
            # Fallback default scaling
            scaled_age = (age - 17.0) / 8.0
            scaled_fiq = (fiq - 105.0) / 15.0

        pheno_vector = torch.tensor([scaled_age, scaled_fiq, sex], dtype=torch.float32)
        return pheno_vector

    def matrix_to_graph_data(
        self,
        fc_matrix: np.ndarray,
        phenotypic_vector: torch.Tensor,
        label: Optional[int] = None,
        subject_id: str = "SUB_001",
        site_id: str = "UNKNOWN"
    ) -> Data:
        """
        Converts a single (116, 116) functional connectivity matrix into a PyG Data graph.

        Graph definition:
        - Nodes: 116 brain Regions of Interest (ROIs).
        - Node Features (x): The 116-dimensional FC profile of each ROI (shape [116, 116]).
        - Edges (edge_index): Indices of pairs where correlation exceeds threshold percentile (shape [2, E]).
        - Edge Attributes (edge_attr): Correlation weights of selected edges (shape [E, 1]).
        - Phenotypic (phenotypic): Demographic vector (shape [1, 3]).
        - Target (y): Diagnostic class 0 (Control) or 1 (ASD) (shape [1]).

        Args:
            fc_matrix: (116, 116) symmetric correlation matrix.
            phenotypic_vector: (3,) demographic tensor.
            label: 0 or 1 binary diagnostic label.
            subject_id: Subject identifier.
            site_id: Clinical imaging site.

        Returns:
            PyTorch Geometric Data instance.
        """
        binary_adj, weighted_adj = self.parcellation_service.threshold_connectivity(
            fc_matrix,
            threshold_percentile=self.threshold_percentile
        )

        # Extract edge indices (COO format)
        src_nodes, dst_nodes = np.nonzero(binary_adj)
        edge_index = torch.tensor(np.vstack([src_nodes, dst_nodes]), dtype=torch.long)

        # Extract edge weights
        edge_weights = weighted_adj[src_nodes, dst_nodes]
        edge_attr = torch.tensor(edge_weights, dtype=torch.float32).unsqueeze(1)

        # Node features: each ROI is represented by its functional connectivity profile vector
        x = torch.tensor(fc_matrix, dtype=torch.float32)

        # Target label tensor
        y = torch.tensor([label], dtype=torch.long) if label is not None else None

        data = Data(
            x=x,
            edge_index=edge_index,
            edge_attr=edge_attr,
            phenotypic=phenotypic_vector.unsqueeze(0),
            y=y,
            num_nodes=self.n_rois,
            subject_id=subject_id,
            site_id=site_id
        )
        return data

    def build_dataset(
        self,
        pheno_df: pd.DataFrame,
        fc_matrices: np.ndarray
    ) -> List[Data]:
        """
        Constructs a list of PyG Data graphs from a cohort.

        Args:
            pheno_df: DataFrame containing phenotypic metadata.
            fc_matrices: 3D array of shape (N, 116, 116).

        Returns:
            List of PyG Data instances.
        """
        if not self._is_scaler_fitted:
            self.fit_phenotypic_scaler(pheno_df)

        dataset: List[Data] = []
        n_subjects = len(pheno_df)
        logger.info(f"Building {n_subjects} PyG brain graphs...")

        for idx, row in pheno_df.iterrows():
            matrix = fc_matrices[idx]
            pheno_vec = self.transform_phenotypic_features(row)
            label = int(row["DX_GROUP"]) if "DX_GROUP" in row else None
            sub_id = str(row["SUB_ID"]) if "SUB_ID" in row else f"SUB_{idx}"
            site_id = str(row["SITE_ID"]) if "SITE_ID" in row else "UNKNOWN"

            graph_data = self.matrix_to_graph_data(
                fc_matrix=matrix,
                phenotypic_vector=pheno_vec,
                label=label,
                subject_id=sub_id,
                site_id=site_id
            )
            dataset.append(graph_data)

        logger.info(f"Successfully generated {len(dataset)} brain graphs.")
        return dataset

    @staticmethod
    def create_dataloader(dataset: List[Data], batch_size: int = 16, shuffle: bool = True) -> DataLoader:
        """
        Creates a PyTorch Geometric DataLoader supporting mini-batch graph pooling.
        """
        return DataLoader(dataset, batch_size=batch_size, shuffle=shuffle)
