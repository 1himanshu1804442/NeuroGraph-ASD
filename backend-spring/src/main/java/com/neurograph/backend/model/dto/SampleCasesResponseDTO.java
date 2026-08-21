package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

/**
 * Response payload wrapper for sample clinical cases.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class SampleCasesResponseDTO {

    @JsonProperty("cases")
    private List<SampleCaseDTO> cases;
}
