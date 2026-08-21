"""
Brain parcellation and functional connectivity matrix computation module.
Extracts regional time-series using brain atlases (AAL-116) and computes
inter-regional Pearson correlation coefficients.
"""

from typing import Optional, Tuple
import numpy as np
from src.utils.logger import get_logger

logger = get_logger(__name__)

# Standard AAL-116 Region of Interest (ROI) count
AAL116_ROI_COUNT = 116

# Key AAL brain regions associated with Default Mode Network (DMN) & Salience Network
AAL_KEY_REGIONS = {
    0: "Precentral_L",
    1: "Precentral_R",
    3: "Frontal_Sup_L",
    4: "Frontal_Sup_R",
    23: "Frontal_Sup_Medial_L",
    24: "Frontal_Sup_Medial_R",
    35: "Cingulate_Post_L",     # DMN key hub
    36: "Cingulate_Post_R",     # DMN key hub
    37: "Hippocampus_L",
    38: "Hippocampus_R",
    39: "Amygdala_L",
    40: "Amygdala_R",
    59: "Parietal_Sup_L",
    60: "Parietal_Sup_R",
    67: "Precuneus_L",          # DMN key hub
    68: "Precuneus_R",          # DMN key hub
    81: "Temporal_Sup_L",
    82: "Temporal_Sup_R",
}


def compute_functional_connectivity(
    time_series: np.ndarray,
    apply_fisher_z: bool = True,
    zero_diagonal: bool = True
) -> np.ndarray:
    """
    Computes the Pearson Correlation Functional Connectivity (FC) matrix
    between all brain Regions of Interest (ROIs).

    Why this approach?
    - Functional synchrony between brain regions is captured by the Pearson
      correlation of their blood-oxygen-level-dependent (BOLD) signals over time.
    - Fisher's r-to-z transformation stabilizes variance across subjects,
      making the connectivity values normally distributed for neural network input.

    Args:
        time_series: 2D numpy array of shape (timepoints, n_rois).
        apply_fisher_z: If True, applies Fisher's r-to-z transformation.
        zero_diagonal: If True, sets the self-correlation diagonal to 0.

    Returns:
        2D numpy array of shape (n_rois, n_rois) representing the FC matrix.
    """
    if time_series.ndim != 2:
        raise ValueError(f"Expected 2D time_series (timepoints, n_rois), got shape {time_series.shape}")

    n_timepoints, n_rois = time_series.shape
    logger.debug(f"Computing functional connectivity for {n_rois} ROIs across {n_timepoints} timepoints")

    # Compute pairwise Pearson correlation matrix
    corr_matrix = np.corrcoef(time_series, rowvar=False)

    # Handle NaN or Inf values resulting from zero-variance signals
    corr_matrix = np.nan_to_num(corr_matrix, nan=0.0, posinf=1.0, neginf=-1.0)

    # Apply Fisher r-to-z transformation: z = 0.5 * ln((1 + r) / (1 - r))
    if apply_fisher_z:
        # Clip values slightly below 1.0 and above -1.0 to avoid arctanh infinity
        clipped_corr = np.clip(corr_matrix, -0.9999, 0.9999)
        fc_matrix = np.arctanh(clipped_corr)
    else:
        fc_matrix = corr_matrix

    if zero_diagonal:
        np.fill_diagonal(fc_matrix, 0.0)

    return fc_matrix


class ParcellationService:
    """
    Service responsible for loading brain atlas definitions and parcellating
    fMRI 4D volumes into ROI-averaged time-series.
    """

    def __init__(self, atlas_name: str = "aal", n_rois: int = AAL116_ROI_COUNT):
        self.atlas_name = atlas_name.lower()
        self.n_rois = n_rois
        logger.info(f"Initialized ParcellationService with atlas: {self.atlas_name} ({self.n_rois} ROIs)")

    def generate_synthetic_time_series(
        self,
        n_timepoints: int = 180,
        is_asd: bool = False,
        seed: Optional[int] = None
    ) -> np.ndarray:
        """
        Generates realistic synthetic BOLD time-series for testing and prototyping
        without requiring multi-gigabyte raw fMRI downloads.

        Why this works for testing:
        - Simulates resting-state low-frequency BOLD fluctuations (0.01 - 0.1 Hz).
        - Introduces characteristic DMN (Default Mode Network) under-connectivity
          frequently observed in ASD clinical literature.

        Args:
            n_timepoints: Number of temporal scan volumes (default: 180).
            is_asd: If True, modulates connectivity to reflect ASD biomarker patterns.
            seed: Optional random seed for deterministic generation.

        Returns:
            2D numpy array of shape (n_timepoints, n_rois).
        """
        if seed is not None:
            np.random.seed(seed)

        # Base spontaneous neural oscillation
        t = np.linspace(0, 100, n_timepoints)
        base_signal = np.random.normal(0, 1.0, size=(n_timepoints, self.n_rois))

        # Shared network factors (DMN, Salience, Visual, Motor)
        dmn_factor = np.sin(2 * np.pi * 0.04 * t)[:, None]
        salience_factor = np.cos(2 * np.pi * 0.03 * t)[:, None]

        # Key DMN indices in AAL atlas: Cingulate Post (35, 36), Precuneus (67, 68), Frontal Sup Medial (23, 24)
        dmn_rois = [23, 24, 35, 36, 67, 68]
        salience_rois = [3, 4, 39, 40, 59, 60]

        # ASD subjects often show reduced long-range DMN functional synchrony
        dmn_strength = 0.35 if is_asd else 0.85
        salience_strength = 0.75 if is_asd else 0.50

        base_signal[:, dmn_rois] += dmn_factor * dmn_strength
        base_signal[:, salience_rois] += salience_factor * salience_strength

        # Normalize per ROI
        mean = np.mean(base_signal, axis=0, keepdims=True)
        std = np.std(base_signal, axis=0, keepdims=True) + 1e-8
        normalized_signal = (base_signal - mean) / std

        return normalized_signal

    def threshold_connectivity(
        self,
        fc_matrix: np.ndarray,
        threshold_percentile: float = 80.0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Applies proportional thresholding to keep the top strongest positive connections.

        Why thresholding?
        - Dense full matrices contain spurious weak correlations.
        - Preserving top graph topological connections enhances Graph Attention Network efficiency.

        Args:
            fc_matrix: (n_rois, n_rois) functional connectivity matrix.
            threshold_percentile: Percentile cutoff (0-100) for edge retention.

        Returns:
            Tuple of (binary_adjacency_matrix, weighted_adjacency_matrix).
        """
        # Exclude diagonal
        off_diagonal = fc_matrix[~np.eye(fc_matrix.shape[0], dtype=bool)]
        cutoff = np.percentile(off_diagonal[off_diagonal > 0], threshold_percentile) if np.any(off_diagonal > 0) else 0.0

        binary_adj = (fc_matrix >= cutoff).astype(np.float32)
        np.fill_diagonal(binary_adj, 0.0)

        weighted_adj = fc_matrix * binary_adj
        return binary_adj, weighted_adj
