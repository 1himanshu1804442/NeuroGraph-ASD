"""
High-Performance Saliency Subgraph Cache for NeuroGraph-ASD.
Caches computationally intensive GNNExplainer saliency results using SHA-256 matrix hashing.
Ensures sub-millisecond response times for frequently analyzed patient connectomes.
"""

import os
import pickle
import hashlib
from typing import Optional, Dict, Any
import numpy as np

from src.explainability.gnn_explainer import BrainXAIResult
from src.utils.logger import get_logger

logger = get_logger(__name__)


class SaliencyCache:
    """
    Two-tier (In-Memory + Disk) cache for GNNExplainer XAI results.
    """

    def __init__(self, cache_dir: str = ".cache/xai_saliency", max_memory_entries: int = 500, enabled: bool = True):
        self.enabled = enabled
        self.cache_dir = cache_dir
        self.max_memory_entries = max_memory_entries
        self._memory_cache: Dict[str, BrainXAIResult] = {}

        if self.enabled:
            os.makedirs(self.cache_dir, exist_ok=True)
            logger.info(f"SaliencyCache initialized (enabled={self.enabled}, dir='{self.cache_dir}')")

    def _compute_key(self, fc_matrix: np.ndarray, pheno_vector: Optional[np.ndarray] = None) -> str:
        """
        Generates a deterministic SHA-256 hash from the FC matrix and patient metadata.
        """
        hasher = hashlib.sha256()
        # Round slightly to prevent micro floating-point variance
        rounded_fc = np.round(fc_matrix, decimals=4).tobytes()
        hasher.update(rounded_fc)
        if pheno_vector is not None:
            hasher.update(np.round(pheno_vector, decimals=4).tobytes())
        return hasher.hexdigest()

    def get(self, fc_matrix: np.ndarray, pheno_vector: Optional[np.ndarray] = None) -> Optional[BrainXAIResult]:
        """
        Retrieves precomputed BrainXAIResult if present in memory or disk.
        """
        if not self.enabled:
            return None

        key = self._compute_key(fc_matrix, pheno_vector)

        # Tier 1: In-Memory L1 Cache
        if key in self._memory_cache:
            logger.info(f"[SaliencyCache] L1 Memory Hit for key: {key[:8]}...")
            return self._memory_cache[key]

        # Tier 2: Persistent Disk L2 Cache
        disk_path = os.path.join(self.cache_dir, f"{key}.pkl")
        if os.path.exists(disk_path):
            try:
                with open(disk_path, "rb") as f:
                    result = pickle.load(f)
                self._put_memory(key, result)
                logger.info(f"[SaliencyCache] L2 Disk Hit for key: {key[:8]}...")
                return result
            except Exception as e:
                logger.warning(f"[SaliencyCache] Failed reading disk cache entry {key[:8]}: {e}")

        return None

    def put(self, fc_matrix: np.ndarray, result: BrainXAIResult, pheno_vector: Optional[np.ndarray] = None) -> None:
        """
        Stores computed BrainXAIResult into both memory and disk tiers.
        """
        if not self.enabled:
            return

        key = self._compute_key(fc_matrix, pheno_vector)
        self._put_memory(key, result)

        # Write to disk
        disk_path = os.path.join(self.cache_dir, f"{key}.pkl")
        try:
            with open(disk_path, "wb") as f:
                pickle.dump(result, f)
            logger.info(f"[SaliencyCache] Cached XAI result for key: {key[:8]}...")
        except Exception as e:
            logger.warning(f"[SaliencyCache] Failed to persist disk cache entry {key[:8]}: {e}")

    def _put_memory(self, key: str, result: BrainXAIResult) -> None:
        """Helper to manage memory cache size with simple eviction."""
        if len(self._memory_cache) >= self.max_memory_entries:
            # Pop the oldest item
            oldest_key = next(iter(self._memory_cache))
            self._memory_cache.pop(oldest_key, None)
        self._memory_cache[key] = result
