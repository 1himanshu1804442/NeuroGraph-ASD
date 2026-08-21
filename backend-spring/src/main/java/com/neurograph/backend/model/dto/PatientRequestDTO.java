package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Data Transfer Object for creating or updating a Patient record.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PatientRequestDTO {

    @NotBlank(message = "Subject ID is required")
    @JsonProperty("subject_id")
    private String subjectId;

    @NotNull(message = "Age is required")
    @DecimalMin(value = "1.0", message = "Age must be at least 1.0 year")
    @DecimalMax(value = "90.0", message = "Age cannot exceed 90.0 years")
    @JsonProperty("age")
    private Double age;

    @NotNull(message = "Sex is required")
    @Min(value = 0, message = "Sex must be 0 (Female) or 1 (Male)")
    @Max(value = 1, message = "Sex must be 0 (Female) or 1 (Male)")
    @JsonProperty("sex")
    private Integer sex;

    @NotNull(message = "Full Scale IQ is required")
    @DecimalMin(value = "40.0", message = "Full Scale IQ must be at least 40.0")
    @DecimalMax(value = "160.0", message = "Full Scale IQ cannot exceed 160.0")
    @JsonProperty("full_scale_iq")
    private Double fullScaleIq;

    @NotBlank(message = "Site ID is required")
    @JsonProperty("site_id")
    private String siteId;
}
