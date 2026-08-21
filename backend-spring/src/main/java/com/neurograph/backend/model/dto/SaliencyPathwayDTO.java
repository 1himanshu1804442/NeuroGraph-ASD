package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

/**
 * Data Transfer Object representing an Explainable AI (XAI) neural pathway edge.
 * 
 * Why: Encapsulates source/target AAL-116 anatomical brain regions, GNNExplainer saliency importance,
 * and canonical functional network circuit classification (e.g. Default Mode Network).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class SaliencyPathwayDTO {

    @JsonProperty("source_name")
    private String sourceName;

    @JsonProperty("target_name")
    private String targetName;

    @JsonProperty("saliency_score")
    private Double saliencyScore;

    @JsonProperty("functional_network")
    private String functionalNetwork;
}
