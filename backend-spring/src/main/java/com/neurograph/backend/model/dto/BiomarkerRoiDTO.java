package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

/**
 * Data Transfer Object representing a top biomarker brain region of interest (ROI).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class BiomarkerRoiDTO {

    @JsonProperty("roi_index")
    private Integer roiIndex;

    @JsonProperty("name")
    private String name;

    @JsonProperty("importance")
    private Double importance;
}
