package com.neurograph.backend.service;

import com.neurograph.backend.exception.ResourceNotFoundException;
import com.neurograph.backend.model.dto.PatientDemographicsDTO;
import com.neurograph.backend.model.dto.PatientRequestDTO;
import com.neurograph.backend.model.dto.PatientResponseDTO;
import com.neurograph.backend.model.entity.Patient;
import com.neurograph.backend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service managing patient registration, clinical demographic updates, and retrieval.
 * 
 * Why: Encapsulates all domain logic for patient clinical records, keeping Controllers thin
 * and guaranteeing ACID transaction boundaries with `@Transactional`.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PatientService {

    private final PatientRepository patientRepository;

    /**
     * Retrieves all registered patient records from PostgreSQL.
     */
    @Transactional(readOnly = true)
    public List<PatientResponseDTO> getAllPatients() {
        log.info("[PatientService] Fetching all registered patient records from database.");
        return patientRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a patient by database primary key ID.
     */
    @Transactional(readOnly = true)
    public PatientResponseDTO getPatientById(Long id) {
        log.info("[PatientService] Querying patient record by ID: {}", id);
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("[PatientService] Patient with ID {} not found in database.", id);
                    return new ResourceNotFoundException("Patient not found with id: " + id);
                });
        return mapToDTO(patient);
    }

    /**
     * Retrieves a patient by clinical subject identifier.
     */
    @Transactional(readOnly = true)
    public PatientResponseDTO getPatientBySubjectId(String subjectId) {
        log.info("[PatientService] Querying patient record by subjectId: {}", subjectId);
        Patient patient = patientRepository.findBySubjectId(subjectId)
                .orElseThrow(() -> {
                    log.error("[PatientService] Patient with subjectId '{}' not found.", subjectId);
                    return new ResourceNotFoundException("Patient not found with subjectId: " + subjectId);
                });
        return mapToDTO(patient);
    }

    /**
     * Creates a new patient record from a PatientRequestDTO.
     */
    @Transactional
    public PatientResponseDTO createPatient(PatientRequestDTO request) {
        log.info("[PatientService] Creating new patient record for subjectId: {}", request.getSubjectId());
        if (patientRepository.existsBySubjectId(request.getSubjectId())) {
            log.error("[PatientService] Patient with subject ID {} already exists.", request.getSubjectId());
            throw new IllegalArgumentException("Patient with subject ID " + request.getSubjectId() + " already exists");
        }

        Patient patient = Patient.builder()
                .subjectId(request.getSubjectId())
                .age(request.getAge())
                .sex(request.getSex())
                .fullScaleIq(request.getFullScaleIq())
                .siteId(request.getSiteId())
                .build();

        Patient saved = patientRepository.save(patient);
        log.info("[PatientService] Saved patient #{} with subjectId '{}'", saved.getId(), saved.getSubjectId());
        return mapToDTO(saved);
    }

    /**
     * Finds an existing patient or creates/updates their demographic record.
     * Ensures idempotent patient registration during screening runs.
     */
    @Transactional
    public Patient findOrCreatePatient(PatientDemographicsDTO demographics) {
        log.info("[PatientService] Synchronizing patient record for subjectId: {}", demographics.getSubjectId());
        return patientRepository.findBySubjectId(demographics.getSubjectId())
                .orElseGet(() -> {
                    log.info("[PatientService] Registering net-new patient: {}", demographics.getSubjectId());
                    Patient newPatient = Patient.builder()
                            .subjectId(demographics.getSubjectId())
                            .age(demographics.getAge())
                            .sex(demographics.getSex())
                            .fullScaleIq(demographics.getFullScaleIq())
                            .siteId(demographics.getSiteId())
                            .build();
                    return patientRepository.save(newPatient);
                });
    }

    /**
     * Deletes a patient by database ID.
     */
    @Transactional
    public void deletePatient(Long id) {
        log.info("[PatientService] Deleting patient record with ID: {}", id);
        if (!patientRepository.existsById(id)) {
            log.error("[PatientService] Cannot delete: Patient with ID {} not found.", id);
            throw new ResourceNotFoundException("Patient not found with id: " + id);
        }
        patientRepository.deleteById(id);
        log.info("[PatientService] Deleted patient record #{}", id);
    }

    /**
     * Maps JPA Patient entity to PatientResponseDTO.
     */
    private PatientResponseDTO mapToDTO(Patient patient) {
        int reportCount = (patient.getReports() != null) ? patient.getReports().size() : 0;
        return PatientResponseDTO.builder()
                .id(patient.getId())
                .subjectId(patient.getSubjectId())
                .age(patient.getAge())
                .sex(patient.getSex())
                .fullScaleIq(patient.getFullScaleIq())
                .siteId(patient.getSiteId())
                .createdAt(patient.getCreatedAt())
                .totalReportsCount(reportCount)
                .build();
    }
}
