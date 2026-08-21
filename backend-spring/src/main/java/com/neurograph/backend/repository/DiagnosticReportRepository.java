package com.neurograph.backend.repository;

import com.neurograph.backend.model.entity.DiagnosticReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA Repository for DiagnosticReport entity.
 * 
 * Why: Encapsulates database queries for patient diagnostic reports, historical screenings,
 * and temporal audit logs in PostgreSQL.
 */
@Repository
public interface DiagnosticReportRepository extends JpaRepository<DiagnosticReport, Long> {

    /**
     * Retrieves all diagnostic reports for a given patient entity ID, ordered newest to oldest.
     */
    List<DiagnosticReport> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    /**
     * Retrieves all diagnostic reports for a given subject identifier, ordered newest to oldest.
     */
    @Query("SELECT r FROM DiagnosticReport r JOIN r.patient p WHERE p.subjectId = :subjectId ORDER BY r.createdAt DESC")
    List<DiagnosticReport> findBySubjectIdOrderByCreatedAtDesc(@Param("subjectId") String subjectId);

    /**
     * Retrieves the most recent reports across the whole clinic.
     */
    List<DiagnosticReport> findTop50ByOrderByCreatedAtDesc();
}
