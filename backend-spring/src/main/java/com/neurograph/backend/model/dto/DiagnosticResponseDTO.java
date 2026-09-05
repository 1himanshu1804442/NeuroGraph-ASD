package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object returned to clinicians after GAT multimodal inference.
 * 
 * Why: Bundles diagnostic probabilities, classification results, top neural saliency pathways,
 * and Three.js 3D WebGL glass brain graph payload for interactive visual inspection.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "connectomeGraph")
public class DiagnosticResponseDTO {

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

    @JsonProperty("predicted_class")
    private Integer predictedClass;

    @JsonProperty("predicted_label")
    private String predictedLabel;

    @JsonProperty("asd_probability")
    private Double asdProbability;

    @JsonProperty("control_probability")
    private Double controlProbability;

    @JsonProperty("confidence_percentage")
    private Double confidencePercentage;

    @JsonProperty("top_pathways")
    private List<SaliencyPathwayDTO> topPathways;

    @JsonProperty("top_biomarker_rois")
    private List<BiomarkerRoiDTO> topBiomarkerRois;

    @JsonProperty("network_attribution")
    private Map<String, Double> networkAttribution;

    @JsonProperty("connectome_graph")
    private Map<String, Object> connectomeGraph;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
