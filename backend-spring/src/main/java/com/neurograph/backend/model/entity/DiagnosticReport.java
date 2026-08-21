package com.neurograph.backend.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * DiagnosticReport Entity storing GAT model predictions, probabilities, and Explainable AI (XAI) saliency maps.
 * 
 * Why: Clinicians require historical persistence of screening decisions along with exact biomarker
 * subgraphs and network attribution weights for clinical verification, longitudinal tracking, and auditing.
 */
@Entity
@Table(
    name = "diagnostic_reports",
    indexes = {
        @Index(name = "idx_report_patient_id", columnList = "patient_id"),
        @Index(name = "idx_report_created_at", columnList = "created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "patient")
@EqualsAndHashCode(of = "id")
public class DiagnosticReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Associated patient entity receiving this diagnostic screening.
     * Lazy fetching is used to avoid loading entire patient subgraphs during report listing queries.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    /**
     * Binary diagnostic classification (0 = Typical Control, 1 = Autism Spectrum Disorder).
     */
    @Column(name = "predicted_class", nullable = false)
    private Integer predictedClass;

    /**
     * Human-readable diagnostic classification label ("Autism Spectrum Disorder" or "Typical Control").
     */
    @Column(name = "predicted_label", nullable = false, length = 64)
    private String predictedLabel;

    /**
     * Softmax probability of Autism Spectrum Disorder (0.0 to 1.0).
     */
    @Column(name = "asd_probability", nullable = false)
    private Double asdProbability;

    /**
     * Softmax probability of Typical Control (0.0 to 1.0).
     */
    @Column(name = "control_probability", nullable = false)
    private Double controlProbability;

    /**
     * Confidence percentage for the predicted class (0.0% to 100.0%).
     */
    @Column(name = "confidence_percentage", nullable = false)
    private Double confidencePercentage;

    /**
     * Serialized JSON string containing the top Explainable AI (XAI) neural pathways and saliency scores.
     * Why: Storing complex nested graph metrics as JSON text enables structured persistence without
     * requiring complex relational join tables for transient subgraph structures.
     */
    @Column(name = "saliency_pathways_json", columnDefinition = "TEXT")
    private String saliencyPathwaysJson;

    /**
     * Serialized JSON string of macro-level functional network attributions (e.g. DMN, Salience, Frontoparietal).
     */
    @Column(name = "network_attribution_json", columnDefinition = "TEXT")
    private String networkAttributionJson;

    /**
     * Serialized JSON string of top anatomical Region of Interest (ROI) biomarkers and importances.
     */
    @Column(name = "biomarker_rois_json", columnDefinition = "TEXT")
    private String biomarkerRoisJson;

    /**
     * Timestamp when the diagnostic inference was executed and persisted.
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Automatically sets createdAt timestamp before initial JPA entity insertion.
     */
    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
