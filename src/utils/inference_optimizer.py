"""
PyTorch Inference Optimization and Model Warmup Utilities.
Supports PyTorch 2.x graph mode compilation (`torch.compile`) with graceful eager-mode fallback.
"""

import time
import torch
from src.models.neurograph import NeuroGraphASD
from src.utils.logger import get_logger

logger = get_logger(__name__)


def optimize_model_for_inference(model: NeuroGraphASD, enable_compile: bool = False) -> NeuroGraphASD:
    """
    Applies inference optimizations to the PyTorch neural network:
    - Sets model to eval mode.
    - Disables autograd parameter tracking.
    - Optionally compiles the graph using Inductor backend if supported and requested.
    """
    model.eval()
    for param in model.parameters():
        param.requires_grad = False

    if enable_compile and hasattr(torch, "compile"):
        try:
            logger.info("Attempting PyTorch 2.x model compilation with mode='reduce-overhead'...")
            compiled_model = torch.compile(model, mode="reduce-overhead")
            logger.info("PyTorch 2.x compilation successful.")
            return compiled_model
        except Exception as e:
            logger.warning(f"torch.compile failed (falling back to standard eager execution): {e}")

    return model


def warmup_inference_pipeline(model: NeuroGraphASD, device: torch.device, n_rois: int = 116) -> float:
    """
    Performs dry-run forward passes to initialize CUDA kernels or JIT caches,
    eliminating cold-start latency for the first patient request.
    """
    logger.info("Executing model warmup dry-runs...")
    start_time = time.perf_counter()

    with torch.no_grad():
        dummy_x = torch.randn((n_rois, n_rois), dtype=torch.float32, device=device)
        dummy_edges = torch.randint(0, n_rois, (2, 250), dtype=torch.long, device=device)
        dummy_edge_attr = torch.rand((250, 1), dtype=torch.float32, device=device)
        dummy_pheno = torch.tensor([[0.0, 0.0, 1.0]], dtype=torch.float32, device=device)

        from torch_geometric.data import Data
        dummy_data = Data(
            x=dummy_x,
            edge_index=dummy_edges,
            edge_attr=dummy_edge_attr,
            phenotypic=dummy_pheno,
            num_nodes=n_rois
        ).to(device)

        # 3 Warmup passes
        for _ in range(3):
            _ = model(dummy_data)

    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(f"Model warmup complete in {duration_ms:.2f} ms")
    return duration_ms
