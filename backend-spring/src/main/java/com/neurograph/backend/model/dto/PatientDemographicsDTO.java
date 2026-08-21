package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Data Transfer Object representing patient phenotypic demographics.
 * 
 * Why: Encapsulates patient clinical features with explicit Bean Validation constraints
 * matching the ABIDE (Autism Brain Imaging Data Exchange) cohort specifications.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PatientDemographicsDTO {

    @NotBlank(message = "subject_id is required")
    @JsonProperty("subject_id")
    private String subjectId;

    @NotNull(message = "age is required")
    @DecimalMin(value = "1.0", message = "Age must be at least 1.0 years")
    @DecimalMax(value = "90.0", message = "Age cannot exceed 90.0 years")
    @JsonProperty("age")
    private Double age;

    @NotNull(message = "sex is required (0 = Female, 1 = Male)")
    @Min(value = 0, message = "Sex must be 0 (Female) or 1 (Male)")
    @Max(value = 1, message = "Sex must be 0 (Female) or 1 (Male)")
    @JsonProperty("sex")
    private Integer sex;

    @NotNull(message = "full_scale_iq is required")
    @DecimalMin(value = "40.0", message = "Full Scale IQ must be at least 40.0")
    @DecimalMax(value = "160.0", message = "Full Scale IQ cannot exceed 160.0")
    @JsonProperty("full_scale_iq")
    private Double fullScaleIq;

    @NotBlank(message = "site_id is required")
    @JsonProperty("site_id")
    private String siteId;
}
