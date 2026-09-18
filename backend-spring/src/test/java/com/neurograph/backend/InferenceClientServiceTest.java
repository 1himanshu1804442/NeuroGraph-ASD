package com.neurograph.backend;

import com.neurograph.backend.model.dto.DiagnosticResponseDTO;
import com.neurograph.backend.model.dto.PatientDemographicsDTO;
import com.neurograph.backend.service.InferenceClientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit Test Suite for InferenceClientService.
 * Verifies embedded Facial GCN Phenotypic Engine logic when Python microservice is offline.
 */
@ExtendWith(MockitoExtension.class)
class InferenceClientServiceTest {

    @Mock
    private RestClient restClient;

    private InferenceClientService inferenceClientService;

    @BeforeEach
    void setUp() {
        inferenceClientService = new InferenceClientService(restClient);
    }

    @Test
    @DisplayName("calculateFacialGcnInference should generate 68 canonical landmarks and GCN saliency pathways")
    void calculateFacialGcnInference_Generates68LandmarksAndSaliency() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test_face.jpg",
                "image/jpeg",
                "dummy-image-bytes".getBytes()
        );

        PatientDemographicsDTO demographics = PatientDemographicsDTO.builder()
                .subjectId("PATIENT_TEST_01")
                .age(11.0)
                .sex(1)
                .fullScaleIq(100.0)
                .siteId("NYU_CLINIC")
                .build();

        DiagnosticResponseDTO response = inferenceClientService.calculateFacialGcnInference(file, demographics);

        assertThat(response).isNotNull();
        assertThat(response.getSubjectId()).isEqualTo("PATIENT_TEST_01");
        assertThat(response.getPredictedLabel()).isIn("Autism Spectrum Disorder", "Typical Control");
        assertThat(response.getAsdProbability()).isBetween(0.0, 1.0);
        assertThat(response.getControlProbability()).isBetween(0.0, 1.0);
        assertThat(response.getConfidencePercentage()).isBetween(50.0, 100.0);

        // Verify 68 canonical facial landmark nodes
        List<Map<String, Object>> landmarks = response.getFacialLandmarks();
        assertThat(landmarks).isNotNull();
        assertThat(landmarks).hasSize(68);

        // Verify all 68 points have index, normalized coordinates in [0, 1], and canonical region
        for (int i = 0; i < 68; i++) {
            Map<String, Object> lm = landmarks.get(i);
            assertThat(lm.get("index")).isEqualTo(i);
            double x = ((Number) lm.get("x")).doubleValue();
            double y = ((Number) lm.get("y")).doubleValue();
            assertThat(x).isBetween(0.0, 1.0);
            assertThat(y).isBetween(0.0, 1.0);
            assertThat(lm.get("region")).isNotNull();
        }

        // Verify key anatomical regions are represented
        assertThat(landmarks.get(0).get("region")).isEqualTo("Jaw");
        assertThat(landmarks.get(8).get("region")).isEqualTo("Jaw"); // Gnathion
        assertThat(landmarks.get(17).get("region")).isEqualTo("Right Eyebrow");
        assertThat(landmarks.get(22).get("region")).isEqualTo("Left Eyebrow");
        assertThat(landmarks.get(27).get("region")).isEqualTo("Nose"); // Nasion
        assertThat(landmarks.get(33).get("region")).isEqualTo("Nose"); // Subnasale
        assertThat(landmarks.get(36).get("region")).isEqualTo("Right Eye");
        assertThat(landmarks.get(45).get("region")).isEqualTo("Left Eye");
        assertThat(landmarks.get(51).get("region")).isEqualTo("Mouth"); // Labiale Superius

        // Verify GCN network attributions across the 4 specified domains
        Map<String, Double> networkAttr = response.getNetworkAttribution();
        assertThat(networkAttr).containsKeys(
                "Periorbital / Ocular Symmetry",
                "Mid-face & Nasal Morphology",
                "Oral / Philtrum Dynamics",
                "Lower Facial Contour"
        );

        // Verify Top GCN Saliency Pathways
        assertThat(response.getTopPathways()).isNotEmpty();
        assertThat(response.getTopPathways().get(0).getSaliencyScore()).isPositive();

        // Verify Top Biomarker ROIs
        assertThat(response.getTopBiomarkerRois()).isNotEmpty();

        // Verify Connectome Graph
        Map<String, Object> graph = response.getConnectomeGraph();
        assertThat(graph).isNotNull();
        assertThat(graph.get("nodes")).isNotNull();
        assertThat(graph.get("links")).isNotNull();
    }
}
