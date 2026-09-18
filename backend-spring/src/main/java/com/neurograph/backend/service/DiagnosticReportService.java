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
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.neurograph.backend.config.AbideDataSeeder;

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
    private final AbideDataSeeder abideDataSeeder;

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

        // Step 3: Prevent duplicate persistence on rapid page refreshes (within 15 seconds for the same subject)
        List<DiagnosticReport> existingReports = diagnosticReportRepository.findBySubjectIdOrderByCreatedAtDesc(patient.getSubjectId());
        if (!existingReports.isEmpty()) {
            DiagnosticReport latest = existingReports.get(0);
            if (latest.getCreatedAt() != null) {
                long diffSeconds = java.time.Duration.between(latest.getCreatedAt(), java.time.LocalDateTime.now()).abs().toSeconds();
                if (diffSeconds < 15 && latest.getPredictedClass().equals(inferenceResult.getPredictedClass())) {
                    log.info("[DiagnosticReportService] Recent report #{} found for subject '{}' ({}s ago). Reusing existing report to avoid reload duplicates.",
                            latest.getId(), patient.getSubjectId(), diffSeconds);
                    inferenceResult.setId(latest.getId());
                    inferenceResult.setCreatedAt(latest.getCreatedAt());
                    return inferenceResult;
                }
            }
        }

        // Step 4: Serialize and persist diagnostic report in PostgreSQL
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
     * Executes end-to-end image-based diagnostic inference:
     * 1. Validates the uploaded facial image is non-empty.
     * 2. Synchronizes patient demographics record in PostgreSQL.
     * 3. Converts the image into a base64 thumbnail string for persistence & UI rendering.
     * 4. Forwards to InferenceClientService (Python AI engine or embedded Facial GCN phenotypic engine).
     * 5. Persists the DiagnosticReport entity with landmarks and thumbnail in PostgreSQL.
     * 6. Returns enriched DiagnosticResponseDTO.
     */
    @Transactional
    public DiagnosticResponseDTO runImageDiagnosticInference(MultipartFile file, PatientDemographicsDTO demo) {
        log.info("[DiagnosticReportService] Starting image-based facial GCN screening for subjectId: {}",
                demo != null ? demo.getSubjectId() : "UNKNOWN");

        if (file == null || file.isEmpty()) {
            log.error("[DiagnosticReportService] Image file is missing or empty.");
            throw new IllegalArgumentException("Image file must not be empty.");
        }

        // Step 1: Save or synchronize patient demographic record in PostgreSQL
        Patient patient = patientService.findOrCreatePatient(demo);

        // Step 2: Convert image to base64 thumbnail for persistence and UI rendering
        String thumbnailBase64 = encodeImageToBase64Thumbnail(file);

        // Step 3: Call AI Engine / embedded Facial GCN phenotypic engine
        DiagnosticResponseDTO inferenceResult = inferenceClientService.executeImageInference(file, demo);
        inferenceResult.setImageThumbnailBase64(thumbnailBase64);
        inferenceResult.setSubjectId(patient.getSubjectId());
        inferenceResult.setAge(patient.getAge());
        inferenceResult.setSex(patient.getSex());
        inferenceResult.setFullScaleIq(patient.getFullScaleIq());
        inferenceResult.setSiteId(patient.getSiteId());

        // Step 4: Serialize and persist diagnostic report in PostgreSQL
        try {
            String pathwaysJson = objectMapper.writeValueAsString(inferenceResult.getTopPathways());
            String networkAttrJson = objectMapper.writeValueAsString(inferenceResult.getNetworkAttribution());
            String biomarkerRoisJson = objectMapper.writeValueAsString(inferenceResult.getTopBiomarkerRois());
            String facialLandmarksJson = objectMapper.writeValueAsString(inferenceResult.getFacialLandmarks());

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
                    .imageThumbnailBase64(thumbnailBase64)
                    .facialLandmarksJson(facialLandmarksJson)
                    .build();

            DiagnosticReport savedReport = diagnosticReportRepository.save(report);
            log.info("[DiagnosticReportService] Persisted facial GCN diagnostic report #{} for patient '{}'",
                    savedReport.getId(), patient.getSubjectId());

            // Attach database ID and createdAt to response
            inferenceResult.setId(savedReport.getId());
            inferenceResult.setCreatedAt(savedReport.getCreatedAt());

        } catch (Exception e) {
            log.error("[DiagnosticReportService] Failed to serialize or persist facial GCN diagnostic report: {}", e.getMessage(), e);
        }

        return inferenceResult;
    }

    /**
     * Helper method to convert an uploaded image to a standard Base64 Data URI thumbnail.
     */
    private String encodeImageToBase64Thumbnail(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String contentType = file.getContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "image/jpeg";
            }
            return "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);
        } catch (Exception e) {
            log.error("[DiagnosticReportService] Error encoding image to base64 thumbnail: {}", e.getMessage(), e);
            return null;
        }
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
        return diagnosticReportRepository.findAllByOrderByCreatedAtDesc().stream()
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
     * Clears all historical diagnostic reports from the database.
     */
    @Transactional
    public void clearAllReports() {
        log.warn("[DiagnosticReportService] Deleting all historical diagnostic reports.");
        diagnosticReportRepository.deleteAll();
    }

    /**
     * Seeds the full 100-subject ABIDE I benchmark cohort into PostgreSQL/H2 and returns the populated reports.
     */
    @Transactional
    public List<DiagnosticResponseDTO> seedAbideCohort() {
        log.info("[DiagnosticReportService] Seeding 100 ABIDE I cohort benchmark subjects into database.");
        abideDataSeeder.seedCohort();
        return getAllReports();
    }

    /**
     * Maps a JPA DiagnosticReport entity to a DiagnosticResponseDTO.
     */
    private DiagnosticResponseDTO mapToDTO(DiagnosticReport report) {
        List<SaliencyPathwayDTO> pathways = Collections.emptyList();
        Map<String, Double> networkAttr = Collections.emptyMap();
        List<BiomarkerRoiDTO> biomarkers = Collections.emptyList();
        List<Map<String, Object>> landmarks = Collections.emptyList();

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
            if (report.getFacialLandmarksJson() != null) {
                landmarks = objectMapper.readValue(report.getFacialLandmarksJson(), new TypeReference<List<Map<String, Object>>>() {});
            }
        } catch (Exception e) {
            log.warn("[DiagnosticReportService] Error deserializing JSON report payload: {}", e.getMessage());
        }

        Patient patient = report.getPatient();
        return DiagnosticResponseDTO.builder()
                .id(report.getId())
                .subjectId(patient != null ? patient.getSubjectId() : null)
                .age(patient != null ? patient.getAge() : null)
                .sex(patient != null ? patient.getSex() : null)
                .fullScaleIq(patient != null ? patient.getFullScaleIq() : null)
                .siteId(patient != null ? patient.getSiteId() : null)
                .predictedClass(report.getPredictedClass())
                .predictedLabel(report.getPredictedLabel())
                .asdProbability(report.getAsdProbability())
                .controlProbability(report.getControlProbability())
                .confidencePercentage(report.getConfidencePercentage())
                .topPathways(pathways)
                .networkAttribution(networkAttr)
                .topBiomarkerRois(biomarkers)
                .imageThumbnailBase64(report.getImageThumbnailBase64())
                .facialLandmarks(landmarks)
                .createdAt(report.getCreatedAt())
                .build();
    }
}
