package com.neurograph.backend.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Patient Entity representing a clinical subject undergoing neuroimaging screening.
 * 
 * Why: This entity persists demographic and phenotypic metadata (ABIDE cohort schema)
 * to maintain longitudinal screening records in PostgreSQL and avoid data loss between
 * frontend sessions.
 */
@Entity
@Table(
    name = "patients",
    indexes = {
        @Index(name = "idx_patient_subject_id", columnList = "subject_id", unique = true)
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "reports")
@EqualsAndHashCode(of = "id")
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique clinical subject identifier (e.g. PATIENT_001, NYU_0050002).
     */
    @Column(name = "subject_id", nullable = false, unique = true, length = 64)
    private String subjectId;

    /**
     * Chronological age in years at the time of rs-fMRI acquisition.
     */
    @Column(name = "age", nullable = false)
    private Double age;

    /**
     * Biological sex (0 = Female, 1 = Male).
     */
    @Column(name = "sex", nullable = false)
    private Integer sex;

    /**
     * Standardized Full Scale IQ score (e.g. 105.0).
     */
    @Column(name = "full_scale_iq", nullable = false)
    private Double fullScaleIq;

    /**
     * Clinical acquisition or imaging center identifier (e.g. NYU_CLINIC, STANFORD_MED).
     */
    @Column(name = "site_id", nullable = false, length = 64)
    private String siteId;

    /**
     * Timestamp of initial patient registration in the system.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * One-to-many relationship linking a patient to all historical diagnostic screening reports.
     * CascadeType.ALL ensures cascading lifecycle management, and orphanRemoval cleans up orphaned reports.
     */
    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<DiagnosticReport> reports = new ArrayList<>();

    /**
     * Automatically sets createdAt timestamp before initial JPA entity insertion.
     */
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    /**
     * Helper method to maintain bidirectional relationship integrity when attaching a report.
     * 
     * Why: Bidirectional JPA relationships require both sides of the association to be updated in memory
     * to prevent synchronization inconsistencies before flush.
     * 
     * @param report The diagnostic report to associate with this patient.
     */
    public void addReport(DiagnosticReport report) {
        reports.add(report);
        report.setPatient(this);
    }
}
