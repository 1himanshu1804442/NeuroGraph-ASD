package com.neurograph.backend.controller;

import com.neurograph.backend.model.dto.DiagnosticRequestDTO;
import com.neurograph.backend.model.dto.DiagnosticResponseDTO;
import com.neurograph.backend.model.dto.SampleCasesResponseDTO;
import com.neurograph.backend.service.DiagnosticReportService;
import com.neurograph.backend.service.InferenceClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller exposing multimodal diagnostic screening and explainability endpoints.
 * 
 * Why: Acts as the primary API for clinician dashboard interaction, validating requests
 * and orchestrating inference through the Service layer.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class DiagnosticController {

    private final DiagnosticReportService diagnosticReportService;
    private final InferenceClientService inferenceClientService;

    /**
     * POST /api/v1/predict
     * Executes diagnostic GAT inference, GNNExplainer XAI extraction, and PostgreSQL persistence.
     */
    @PostMapping("/predict")
    public ResponseEntity<DiagnosticResponseDTO> predictDiagnosis(@Valid @RequestBody DiagnosticRequestDTO request) {
        log.info("[DiagnosticController] Received screening request for subjectId: {}",
                request.getDemographics().getSubjectId());
        DiagnosticResponseDTO response = diagnosticReportService.runDiagnosticInference(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/samples
     * Provides preconfigured clinical cohort samples for quick UI evaluation.
     */
    @GetMapping("/samples")
    public ResponseEntity<SampleCasesResponseDTO> getSampleCases() {
        log.info("[DiagnosticController] Received request for clinical sample cases.");
        SampleCasesResponseDTO samples = inferenceClientService.getSampleCases();
        return ResponseEntity.ok(samples);
    }

    /**
     * GET /api/v1/reports
     * Retrieves recent historical diagnostic reports across the entire clinic.
     */
    @GetMapping("/reports")
    public ResponseEntity<List<DiagnosticResponseDTO>> getRecentReports() {
        log.info("[DiagnosticController] Received request for recent diagnostic reports.");
        List<DiagnosticResponseDTO> reports = diagnosticReportService.getAllReports();
        return ResponseEntity.ok(reports);
    }

    /**
     * GET /api/v1/reports/{id}
     * Retrieves a single historical diagnostic report by ID.
     */
    @GetMapping("/reports/{id}")
    public ResponseEntity<DiagnosticResponseDTO> getReportById(@PathVariable Long id) {
        log.info("[DiagnosticController] Received request for diagnostic report ID: {}", id);
        DiagnosticResponseDTO report = diagnosticReportService.getReportById(id);
        return ResponseEntity.ok(report);
    }

    /**
     * DELETE /api/v1/reports
     * Clears all historical diagnostic reports from the database.
     */
    @DeleteMapping("/reports")
    public ResponseEntity<Void> clearAllReports() {
        log.info("[DiagnosticController] Received request to clear all diagnostic reports.");
        diagnosticReportService.clearAllReports();
        return ResponseEntity.noContent().build();
    }
}
