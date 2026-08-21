package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

/**
 * Data Transfer Object for requesting diagnostic inference and Explainable AI extraction.
 * 
 * Why: Accepts phenotypic demographics, optional raw 116x116 Pearson correlation matrices,
 * or predefined preset case identifiers for one-click testing in the clinician dashboard.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "fcMatrix")
public class DiagnosticRequestDTO {

    @NotNull(message = "demographics object is required")
    @Valid
    @JsonProperty("demographics")
    private PatientDemographicsDTO demographics;

    @JsonProperty("fc_matrix")
    private List<List<Double>> fcMatrix;

    @JsonProperty("preset_case")
    private String presetCase;

    @JsonProperty("save_patient_record")
    @Builder.Default
    private Boolean savePatientRecord = true;
}
