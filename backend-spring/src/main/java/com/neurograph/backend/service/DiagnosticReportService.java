package com.neurograph.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.neurograph.backend.exception.ResourceNotFoundException;
import com.neurograph.backend.model.dto.*;
import com.neurograph.backend.model.entity.DiagnosticReport;
import com.neurograph.backend.model.entity.Patient;
import com.neurograph.backend.repository.DiagnosticReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service orchestrating the complete clinical diagnostic workflow and report persistence.
 * 
 * Why: Guarantees transactional persistence of patient cases and their associated
 * Explainable AI biomarker outputs in PostgreSQL.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DiagnosticReportService {

    private final PatientService patientService;
    private final InferenceClientService inferenceClientService;
    private final DiagnosticReportRepository diagnosticReportRepository;
    private final ObjectMapper objectMapper;

    /**
     * Executes end-to-end diagnostic screening:
     * 1. Persists or updates the patient profile in PostgreSQL.
     * 2. Calls the Python ML Engine for GAT inference & GNNExplainer saliency extraction.
     * 3. Stores the resulting DiagnosticReport entity.
     * 4. Returns the enriched response DTO to the client.
     */
    @Transactional
    public DiagnosticResponseDTO runDiagnosticInference(DiagnosticRequestDTO request) {
        log.info("[DiagnosticReportService] Starting clinical screening for subjectId: {}",
                request.getDemographics().getSubjectId());

        // Step 1: Save or synchronize patient demographic record in PostgreSQL
        Patient patient = patientService.findOrCreatePatient(request.getDemographics());

        // Step 2: Call Python AI engine for GAT forward pass + XAI graph saliency
        DiagnosticResponseDTO inferenceResult = inferenceClientService.executeInference(request);

        // Step 3: Serialize and persist diagnostic report in PostgreSQL
        try {
            String pathwaysJson = objectMapper.writeValueAsString(inferenceResult.getTopPathways());
            String networkAttrJson = objectMapper.writeValueAsString(inferenceResult.getNetworkAttribution());
            String biomarkerRoisJson = objectMapper.writeValueAsString(inferenceResult.getTopBiomarkerRois());

            DiagnosticReport report = DiagnosticReport.builder()
                    .patient(patient)
                    .predictedClass(inferenceResult.getPredictedClass())
                    .predictedLabel(inferenceResult.getPredictedLabel())
                    .asdProbability(inferenceResult.getAsdProbability())
                    .controlProbability(inferenceResult.getControlProbability())
                    .confidencePercentage(inferenceResult.getConfidencePercentage())
                    .saliencyPathwaysJson(pathwaysJson)
                    .networkAttributionJson(networkAttrJson)
                    .biomarkerRoisJson(biomarkerRoisJson)
                    .build();

            DiagnosticReport savedReport = diagnosticReportRepository.save(report);
            log.info("[DiagnosticReportService] Persisted diagnostic report #{} for patient '{}'",
                    savedReport.getId(), patient.getSubjectId());

            // Attach database ID to response
            inferenceResult.setId(savedReport.getId());
            inferenceResult.setCreatedAt(savedReport.getCreatedAt());

        } catch (Exception e) {
            log.error("[DiagnosticReportService] Failed to serialize or persist diagnostic report: {}", e.getMessage(), e);
        }

        return inferenceResult;
    }

    /**
     * Alias for runDiagnosticInference to maintain backward compatibility.
     */
    @Transactional
    public DiagnosticResponseDTO runDiagnosticScreening(DiagnosticRequestDTO request) {
        return runDiagnosticInference(request);
    }

    /**
     * Retrieves all diagnostic reports mapped to response DTOs.
     */
    @Transactional(readOnly = true)
    public List<DiagnosticResponseDTO> getAllReports() {
        log.info("[DiagnosticReportService] Querying all diagnostic reports.");
        return diagnosticReportRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single diagnostic report by its primary key ID.
     */
    @Transactional(readOnly = true)
    public DiagnosticResponseDTO getReportById(Long id) {
        log.info("[DiagnosticReportService] Querying report by ID: {}", id);
        DiagnosticReport report = diagnosticReportRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("[DiagnosticReportService] Diagnostic report with ID {} not found.", id);
                    return new ResourceNotFoundException("Diagnostic report not found with id: " + id);
                });
        return mapToDTO(report);
    }

    /**
     * Retrieves all past diagnostic reports for a given patient subjectId.
     */
    @Transactional(readOnly = true)
    public List<DiagnosticResponseDTO> getReportsBySubjectId(String subjectId) {
        log.info("[DiagnosticReportService] Querying reports for subjectId: {}", subjectId);
        return diagnosticReportRepository.findBySubjectIdOrderByCreatedAtDesc(subjectId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Maps a JPA DiagnosticReport entity to a DiagnosticResponseDTO.
     */
    private DiagnosticResponseDTO mapToDTO(DiagnosticReport report) {
        List<SaliencyPathwayDTO> pathways = Collections.emptyList();
        Map<String, Double> networkAttr = Collections.emptyMap();
        List<BiomarkerRoiDTO> biomarkers = Collections.emptyList();

        try {
            if (report.getSaliencyPathwaysJson() != null) {
                pathways = objectMapper.readValue(report.getSaliencyPathwaysJson(), new TypeReference<List<SaliencyPathwayDTO>>() {});
            }
            if (report.getNetworkAttributionJson() != null) {
                networkAttr = objectMapper.readValue(report.getNetworkAttributionJson(), new TypeReference<Map<String, Double>>() {});
            }
            if (report.getBiomarkerRoisJson() != null) {
                biomarkers = objectMapper.readValue(report.getBiomarkerRoisJson(), new TypeReference<List<BiomarkerRoiDTO>>() {});
            }
        } catch (Exception e) {
            log.warn("[DiagnosticReportService] Error deserializing JSON report payload: {}", e.getMessage());
        }

        return DiagnosticResponseDTO.builder()
                .id(report.getId())
                .subjectId(report.getPatient() != null ? report.getPatient().getSubjectId() : null)
                .predictedClass(report.getPredictedClass())
                .predictedLabel(report.getPredictedLabel())
                .asdProbability(report.getAsdProbability())
                .controlProbability(report.getControlProbability())
                .confidencePercentage(report.getConfidencePercentage())
                .topPathways(pathways)
                .networkAttribution(networkAttr)
                .topBiomarkerRois(biomarkers)
                .createdAt(report.getCreatedAt())
                .build();
    }
}
