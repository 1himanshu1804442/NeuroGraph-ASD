package com.neurograph.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neurograph.backend.controller.DiagnosticController;
import com.neurograph.backend.exception.GlobalExceptionHandler;
import com.neurograph.backend.exception.ResourceNotFoundException;
import com.neurograph.backend.model.dto.*;
import com.neurograph.backend.service.DiagnosticReportService;
import com.neurograph.backend.service.InferenceClientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * MockMvc Controller tests for DiagnosticController as part of the No-Mistakes Pipeline.
 * Tests REST endpoints, HTTP status codes, JSON serialization, and validation errors.
 */
@WebMvcTest(DiagnosticController.class)
@Import(GlobalExceptionHandler.class)
class DiagnosticControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DiagnosticReportService diagnosticReportService;

    @MockBean
    private InferenceClientService inferenceClientService;

    private DiagnosticResponseDTO sampleResponse;
    private DiagnosticRequestDTO sampleRequest;

    @BeforeEach
    void setUp() {
        PatientDemographicsDTO demographics = PatientDemographicsDTO.builder()
                .subjectId("PATIENT_001")
                .age(11.0)
                .sex(1)
                .fullScaleIq(105.0)
                .siteId("NYU_CLINIC")
                .build();

        sampleRequest = DiagnosticRequestDTO.builder()
                .demographics(demographics)
                .presetCase("asd_sample")
                .savePatientRecord(true)
                .build();

        sampleResponse = DiagnosticResponseDTO.builder()
                .id(1L)
                .subjectId("PATIENT_001")
                .predictedClass(1)
                .predictedLabel("Autism Spectrum Disorder")
                .asdProbability(0.875)
                .controlProbability(0.125)
                .confidencePercentage(87.5)
                .topPathways(List.of(
                        SaliencyPathwayDTO.builder()
                                .sourceName("Frontal_Sup_Medial_L")
                                .targetName("Cingulum_Ant_L")
                                .saliencyScore(0.924)
                                .functionalNetwork("Default Mode Network")
                                .build()
                ))
                .topBiomarkerRois(List.of(
                        BiomarkerRoiDTO.builder()
                                .roiIndex(23)
                                .name("Frontal_Sup_Medial_L")
                                .importance(0.89)
                                .build()
                ))
                .networkAttribution(Map.of("Default Mode Network", 0.45, "Salience Network", 0.35))
                .connectomeGraph(Map.of("nodes", List.of(), "edges", List.of()))
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/samples should return preset clinical sample cases")
    void getSampleCases_ReturnsOk() throws Exception {
        SampleCasesResponseDTO sampleCases = SampleCasesResponseDTO.builder()
                .cases(List.of(
                        SampleCaseDTO.builder()
                                .id("asd_sample")
                                .label("Suspected ASD Case (Male, Age 9.5, FIQ 98)")
                                .demographics(sampleRequest.getDemographics())
                                .build()
                ))
                .build();

        when(inferenceClientService.getSampleCases()).thenReturn(sampleCases);

        mockMvc.perform(get("/api/v1/samples"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.cases").isArray())
                .andExpect(jsonPath("$.cases[0].id").value("asd_sample"));
    }

    @Test
    @DisplayName("POST /api/v1/predict with valid payload should return 200 and diagnostic prediction")
    void predictDiagnosis_ValidPayload_ReturnsOk() throws Exception {
        when(diagnosticReportService.runDiagnosticInference(any(DiagnosticRequestDTO.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/predict")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRequest)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.subject_id").value("PATIENT_001"))
                .andExpect(jsonPath("$.predicted_class").value(1))
                .andExpect(jsonPath("$.predicted_label").value("Autism Spectrum Disorder"))
                .andExpect(jsonPath("$.confidence_percentage").value(87.5))
                .andExpect(jsonPath("$.top_pathways[0].source_name").value("Frontal_Sup_Medial_L"))
                .andExpect(jsonPath("$.top_pathways[0].functional_network").value("Default Mode Network"));
    }

    @Test
    @DisplayName("POST /api/v1/predict with invalid payload (missing age) should return 400 Bad Request")
    void predictDiagnosis_InvalidPayload_Returns400() throws Exception {
        // Demographics missing required age
        PatientDemographicsDTO invalidDemographics = PatientDemographicsDTO.builder()
                .subjectId("PATIENT_INVALID")
                .sex(1)
                .fullScaleIq(100.0)
                .siteId("NYU")
                .build();

        DiagnosticRequestDTO invalidRequest = DiagnosticRequestDTO.builder()
                .demographics(invalidDemographics)
                .build();

        mockMvc.perform(post("/api/v1/predict")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /api/v1/reports should return list of historical diagnostic reports")
    void getAllReports_ReturnsList() throws Exception {
        when(diagnosticReportService.getAllReports()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/api/v1/reports"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].subject_id").value("PATIENT_001"))
                .andExpect(jsonPath("$[0].predicted_label").value("Autism Spectrum Disorder"));
    }

    @Test
    @DisplayName("GET /api/v1/reports/{id} with existing ID should return report")
    void getReportById_Found_ReturnsReport() throws Exception {
        when(diagnosticReportService.getReportById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/v1/reports/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.subject_id").value("PATIENT_001"));
    }

    @Test
    @DisplayName("GET /api/v1/reports/{id} with non-existent ID should return 404 Not Found")
    void getReportById_NotFound_Returns404() throws Exception {
        when(diagnosticReportService.getReportById(999L))
                .thenThrow(new ResourceNotFoundException("Diagnostic report not found with id: 999"));

        mockMvc.perform(get("/api/v1/reports/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Diagnostic report not found with id: 999"));
    }
}
