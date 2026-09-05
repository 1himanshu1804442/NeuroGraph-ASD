package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing patient details and historical screening count.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PatientResponseDTO {

    @JsonProperty("id")
    private Long id;

    @JsonProperty("subject_id")
    private String subjectId;

    @JsonProperty("age")
    private Double age;

    @JsonProperty("sex")
    private Integer sex;

    @JsonProperty("full_scale_iq")
    private Double fullScaleIq;

    @JsonProperty("site_id")
    private String siteId;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("total_reports_count")
    private Integer totalReportsCount;

    @JsonProperty("predicted_class")
    private Integer predictedClass;

    @JsonProperty("predicted_label")
    private String predictedLabel;

    @JsonProperty("asd_probability")
    private Double asdProbability;

    @JsonProperty("confidence_percentage")
    private Double confidencePercentage;
}
