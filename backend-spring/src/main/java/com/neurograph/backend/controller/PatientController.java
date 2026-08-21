package com.neurograph.backend.controller;

import com.neurograph.backend.model.dto.DiagnosticResponseDTO;
import com.neurograph.backend.model.dto.PatientResponseDTO;
import com.neurograph.backend.service.DiagnosticReportService;
import com.neurograph.backend.service.PatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller exposing patient clinical management endpoints.
 * 
 * Why: Strictly follows Layered Architecture rules by accepting HTTP requests,
 * validating inputs, and delegating business operations to PatientService and DiagnosticReportService.
 */
@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Slf4j
public class PatientController {

    private final PatientService patientService;
    private final DiagnosticReportService diagnosticReportService;

    /**
     * GET /api/v1/patients
     * Returns all registered clinical patient records.
     */
    @GetMapping
    public ResponseEntity<List<PatientResponseDTO>> getAllPatients() {
        log.info("[PatientController] Received GET request for all patient records.");
        List<PatientResponseDTO> patients = patientService.getAllPatients();
        return ResponseEntity.ok(patients);
    }

    /**
     * GET /api/v1/patients/{id}
     * Returns a single patient record by database ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<PatientResponseDTO> getPatientById(@PathVariable Long id) {
        log.info("[PatientController] Received GET request for patient ID: {}", id);
        PatientResponseDTO patient = patientService.getPatientById(id);
        return ResponseEntity.ok(patient);
    }

    /**
     * GET /api/v1/patients/subject/{subjectId}
     * Returns a patient record by clinical subjectId.
     */
    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<PatientResponseDTO> getPatientBySubjectId(@PathVariable String subjectId) {
        log.info("[PatientController] Received GET request for subjectId: {}", subjectId);
        PatientResponseDTO patient = patientService.getPatientBySubjectId(subjectId);
        return ResponseEntity.ok(patient);
    }

    /**
     * GET /api/v1/patients/subject/{subjectId}/reports
     * Returns all past diagnostic screening reports for a patient.
     */
    @GetMapping("/subject/{subjectId}/reports")
    public ResponseEntity<List<DiagnosticResponseDTO>> getReportsForSubject(@PathVariable String subjectId) {
        log.info("[PatientController] Received GET request for reports of subjectId: {}", subjectId);
        List<DiagnosticResponseDTO> reports = diagnosticReportService.getReportsBySubjectId(subjectId);
        return ResponseEntity.ok(reports);
    }
}
