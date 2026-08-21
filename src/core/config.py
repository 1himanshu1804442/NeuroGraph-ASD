"""
Application Configuration Module for NeuroGraph-ASD.
Leverages Pydantic Settings for type-safe environment variable management,
CORS security, model architecture hyperparameters, and XAI caching configuration.
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """
    Type-safe runtime settings loaded from environment variables or defaults.
    """
    # Application Metadata
    PROJECT_NAME: str = "NeuroGraph-ASD Clinical Diagnostic API"
    VERSION: str = "1.1.0"
    API_V1_STR: str = "/api"
    DEBUG: bool = False

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS Configuration
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "*"]
    )

    # Machine Learning & XAI Settings
    N_ROIS: int = 116
    GAT_HIDDEN_DIM: int = 64
    GAT_OUT_DIM: int = 64
    PHENO_IN_DIM: int = 3
    PHENO_OUT_DIM: int = 32
    CONNECTOME_THRESHOLD_PERCENTILE: float = 75.0
    GNN_EXPLAINER_EPOCHS: int = 40
    ENABLE_TORCH_COMPILE: bool = False

    # Saliency Cache Settings
    ENABLE_XAI_CACHE: bool = True
    CACHE_DIR: str = ".cache/xai_saliency"
    MAX_CACHE_ENTRIES: int = 1000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings singleton
settings = Settings()
