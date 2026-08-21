"""
Pydantic schemas for the NeuroGraph-ASD REST API.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class PatientDemographics(BaseModel):
    subject_id: str = Field(default="PATIENT_001", description="Patient identifier")
    age: float = Field(..., ge=1.0, le=90.0, description="Age in years at scan")
    sex: int = Field(..., ge=0, le=1, description="0 = Female, 1 = Male")
    full_scale_iq: float = Field(default=105.0, ge=40.0, le=160.0, description="Standardized IQ score")
    site_id: str = Field(default="CLINICAL_CENTER_A", description="Acquisition imaging site")


class PredictionRequest(BaseModel):
    demographics: PatientDemographics
    fc_matrix: Optional[List[List[float]]] = Field(
        default=None,
        description="Optional 116x116 functional connectivity matrix. If omitted, sample matrix is generated based on case preset."
    )
    preset_case: Optional[str] = Field(
        default=None,
        description="Optional quick test preset: 'asd_sample' or 'control_sample'"
    )


class SaliencyEdgeSchema(BaseModel):
    source_name: str
    target_name: str
    saliency_score: float
    functional_network: str


class BiomarkerNodeSchema(BaseModel):
    roi_index: int
    name: str
    importance: float


class PredictionResponse(BaseModel):
    subject_id: str
    predicted_class: int = Field(description="0 = Typical Control, 1 = Autism Spectrum Disorder")
    predicted_label: str = Field(description="'Autism Spectrum Disorder' or 'Typical Control'")
    asd_probability: float
    control_probability: float
    confidence_percentage: float
    top_pathways: List[SaliencyEdgeSchema]
    top_biomarker_rois: List[BiomarkerNodeSchema]
    network_attribution: Dict[str, float]
    connectome_graph: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    version: str
    model_loaded: bool
    device: str
