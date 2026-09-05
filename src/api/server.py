"""
FastAPI Server for NeuroGraph-ASD Clinical Diagnostic API.
Provides RESTful endpoints for screening predictions, GNNExplainer edge saliency maps,
and 3D glass brain connectome visualization payloads.
"""

import time
from typing import Dict, Any
import numpy as np
import torch
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import settings
from src.api.schemas import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
    SaliencyEdgeSchema,
    BiomarkerNodeSchema,
    PatientDemographics
)
from src.data_pipeline.parcellation import ParcellationService, compute_functional_connectivity
from src.data_pipeline.graph_builder import BrainGraphBuilder
from src.models.neurograph import NeuroGraphASD
from src.explainability.gnn_explainer import BrainXAIExplainer, BrainXAIResult
from src.explainability.visualizer import ConnectomeVisualizer
from src.explainability.saliency_cache import SaliencyCache
from src.utils.inference_optimizer import optimize_model_for_inference, warmup_inference_pipeline
from src.utils.logger import get_logger

logger = get_logger(__name__)

# Instantiate FastAPI application with metadata from settings
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Explainable Graph Attention Network for Autism Spectrum Disorder detection from rs-fMRI connectomes.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    Middleware that records execution latency and attaches 'X-Process-Time' header.
    Aids clinicians and developers in profiling inference speed.
    """
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = (time.perf_counter() - start_time) * 1000
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    return response


# Global services & model cache singletons
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model: NeuroGraphASD = None
_graph_builder: BrainGraphBuilder = None
_visualizer: ConnectomeVisualizer = None
_parcellation_service: ParcellationService = None
_saliency_cache: SaliencyCache = None


def get_services():
    """
    Lazy initialization of deep learning models, XAI caching, and data services.
    Ensures single-instance memory allocation across API requests.
    """
    global _model, _graph_builder, _visualizer, _parcellation_service, _saliency_cache
    if _model is None:
        logger.info(f"Initializing NeuroGraph-ASD deep learning pipeline on device: {_device}")
        raw_model = NeuroGraphASD(
            n_rois=settings.N_ROIS,
            gat_hidden=settings.GAT_HIDDEN_DIM,
            gat_out=settings.GAT_OUT_DIM,
            pheno_in=settings.PHENO_IN_DIM,
            pheno_out=settings.PHENO_OUT_DIM
        ).to(_device)

        _model = optimize_model_for_inference(raw_model, enable_compile=settings.ENABLE_TORCH_COMPILE)
        warmup_inference_pipeline(_model, _device, n_rois=settings.N_ROIS)

        _graph_builder = BrainGraphBuilder(
            threshold_percentile=settings.CONNECTOME_THRESHOLD_PERCENTILE,
            n_rois=settings.N_ROIS
        )
        _visualizer = ConnectomeVisualizer()
        _parcellation_service = ParcellationService(n_rois=settings.N_ROIS)
        _saliency_cache = SaliencyCache(
            cache_dir=settings.CACHE_DIR,
            enabled=settings.ENABLE_XAI_CACHE
        )

    return _model, _graph_builder, _visualizer, _parcellation_service, _saliency_cache


@app.on_event("startup")
def on_startup():
    """Warm up pipeline on server startup."""
    logger.info("Server startup event triggered. Loading models...")
    get_services()


@app.get(f"{settings.API_V1_STR}/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint confirming API status, model readiness, and hardware acceleration."""
    model, _, _, _, _ = get_services()
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        model_loaded=model is not None,
        device=str(_device)
    )


@app.get(f"{settings.API_V1_STR}/samples")
def get_sample_cases():
    """Provides sample clinical cases for rapid one-click testing in the clinician dashboard."""
    return {
        "cases": [
            {
                "id": "asd_sample",
                "label": "Suspected ASD Case (Male, Age 9.5, FIQ 98)",
                "demographics": {
                    "subject_id": "PEDIATRIC_ASD_01",
                    "age": 9.5,
                    "sex": 1,
                    "full_scale_iq": 98.0,
                    "site_id": "NYU_CLINIC"
                }
            },
            {
                "id": "control_sample",
                "label": "Typical Control Case (Female, Age 12.0, FIQ 112)",
                "demographics": {
                    "subject_id": "CONTROL_TC_01",
                    "age": 12.0,
                    "sex": 0,
                    "full_scale_iq": 112.0,
                    "site_id": "STANFORD_MED"
                }
            }
        ]
    }


@app.post(f"{settings.API_V1_STR}/predict", response_model=PredictionResponse)
def predict_diagnosis(request: PredictionRequest):
    """
    Executes multimodal diagnostic inference and explainability extraction:
    1. Parses demographics and functional connectivity correlation matrix.
    2. Builds PyG topological graph representation.
    3. Runs multimodal forward computation (GAT + Phenotypic MLP late fusion).
    4. Evaluates or retrieves cached GNNExplainer edge saliency.
    5. Bundles complete 3D connectome graph payload for clinician dashboard.
    """
    model, graph_builder, visualizer, parcellation_service, saliency_cache = get_services()

    try:
        # Determine matrix to use (uploaded custom matrix or synthetic preset case)
        if request.fc_matrix is not None:
            fc_mat = np.array(request.fc_matrix, dtype=np.float32)
            if fc_mat.shape != (settings.N_ROIS, settings.N_ROIS):
                raise HTTPException(
                    status_code=400,
                    detail=f"Expected ({settings.N_ROIS}, {settings.N_ROIS}) matrix, got {fc_mat.shape}"
                )
        else:
            # Generate personalized rs-fMRI scan from patient profile and demographics
            is_asd_preset = (request.preset_case == "asd_sample") or ("asd" in (request.demographics.subject_id or "").lower())
            subj_seed_str = f"{request.demographics.subject_id}_{request.demographics.age}_{request.demographics.sex}_{request.demographics.full_scale_iq}_{request.preset_case}"
            dynamic_seed = abs(hash(subj_seed_str)) % 100000

            ts = parcellation_service.generate_synthetic_time_series(
                n_timepoints=180,
                is_asd=is_asd_preset,
                seed=dynamic_seed
            )
            fc_mat = compute_functional_connectivity(ts, apply_fisher_z=True)

        # Standardize phenotypic demographics
        pheno_vec = torch.tensor([
            (request.demographics.age - 17.0) / 8.0,
            (request.demographics.full_scale_iq - 105.0) / 15.0,
            float(request.demographics.sex)
        ], dtype=torch.float32)

        data = graph_builder.matrix_to_graph_data(
            fc_matrix=fc_mat,
            phenotypic_vector=pheno_vec,
            subject_id=request.demographics.subject_id,
            site_id=request.demographics.site_id
        ).to(_device)

        # Retrieve or compute Explainable AI Saliency Subgraph
        cached_xai = saliency_cache.get(fc_mat, pheno_vec.numpy())
        if cached_xai is not None:
            xai_res = cached_xai
        else:
            explainer = BrainXAIExplainer(model=model, epochs=settings.GNN_EXPLAINER_EPOCHS)
            xai_res = explainer.explain_graph(data, top_k_edges=10)
            saliency_cache.put(fc_mat, xai_res, pheno_vec.numpy())

        # Compute Softmax Diagnostic Probabilities
        with torch.no_grad():
            probs = model.predict_proba(data)[0]
            control_prob = float(probs[0].item())
            asd_prob = float(probs[1].item())

        predicted_class = 1 if asd_prob >= 0.50 else 0
        predicted_label = "Autism Spectrum Disorder" if predicted_class == 1 else "Typical Control"
        confidence_pct = round(float(max(asd_prob, control_prob) * 100), 2)

        # Generate Connectome JSON payload
        connectome_data = visualizer.export_graph_json(fc_matrix=fc_mat, xai_result=xai_res)

        top_pathways = [
            SaliencyEdgeSchema(
                source_name=e.source_name,
                target_name=e.target_name,
                saliency_score=round(e.saliency_score, 4),
                functional_network=e.functional_network
            )
            for e in xai_res.top_edges
        ]

        top_biomarkers = [
            BiomarkerNodeSchema(
                roi_index=n["roi_index"],
                name=n["name"],
                importance=round(n["importance"], 4)
            )
            for n in xai_res.top_nodes
        ]

        logger.info(
            f"Prediction completed for {request.demographics.subject_id}: "
            f"{predicted_label} (Confidence: {confidence_pct}%)"
        )

        return PredictionResponse(
            subject_id=request.demographics.subject_id,
            predicted_class=predicted_class,
            predicted_label=predicted_label,
            asd_probability=round(asd_prob, 4),
            control_probability=round(control_prob, 4),
            confidence_percentage=confidence_pct,
            top_pathways=top_pathways,
            top_biomarker_rois=top_biomarkers,
            network_attribution=xai_res.network_attribution,
            connectome_graph=connectome_data
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during diagnostic prediction for {request.demographics.subject_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
