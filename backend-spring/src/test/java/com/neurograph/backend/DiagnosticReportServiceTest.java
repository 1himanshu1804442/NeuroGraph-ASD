package com.neurograph.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neurograph.backend.config.AbideDataSeeder;
import com.neurograph.backend.model.dto.*;
import com.neurograph.backend.model.entity.DiagnosticReport;
import com.neurograph.backend.model.entity.Patient;
import com.neurograph.backend.repository.DiagnosticReportRepository;
import com.neurograph.backend.service.DiagnosticReportService;
import com.neurograph.backend.service.InferenceClientService;
import com.neurograph.backend.service.PatientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit Test Suite for DiagnosticReportService and Image-Based Facial GCN Screening.
 * Tests business logic, base64 encoding, entity mapping, and fallback behavior.
 */
@ExtendWith(MockitoExtension.class)
class DiagnosticReportServiceTest {

    @Mock
    private PatientService patientService;

    @Mock
    private InferenceClientService inferenceClientService;

    @Mock
    private DiagnosticReportRepository diagnosticReportRepository;

    @Mock
    private AbideDataSeeder abideDataSeeder;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private DiagnosticReportService diagnosticReportService;

    private Patient samplePatient;
    private PatientDemographicsDTO sampleDemographics;
    private DiagnosticResponseDTO sampleInferenceDTO;

    @BeforeEach
    void setUp() {
        samplePatient = Patient.builder()
                .id(1L)
                .subjectId("PATIENT_IMG_001")
                .age(10.5)
                .sex(1)
                .fullScaleIq(105.0)
                .siteId("NYU_CLINIC")
                .createdAt(LocalDateTime.now())
                .reports(new ArrayList<>())
                .build();

        sampleDemographics = PatientDemographicsDTO.builder()
                .subjectId("PATIENT_IMG_001")
                .age(10.5)
                .sex(1)
                .fullScaleIq(105.0)
                .siteId("NYU_CLINIC")
                .build();

        sampleInferenceDTO = DiagnosticResponseDTO.builder()
                .subjectId("PATIENT_IMG_001")
                .predictedClass(1)
                .predictedLabel("Autism Spectrum Disorder")
                .asdProbability(0.88)
                .controlProbability(0.12)
                .confidencePercentage(88.0)
                .topPathways(List.of(
                        SaliencyPathwayDTO.builder()
                                .sourceName("Right_Canthus_36")
                                .targetName("Left_Canthus_45")
                                .saliencyScore(0.912)
                                .functionalNetwork("Periorbital / Ocular Symmetry")
                                .build()
                ))
                .topBiomarkerRois(List.of(
                        BiomarkerRoiDTO.builder()
                                .roiIndex(33)
                                .name("Subnasale (Philtrum Apex)")
                                .importance(2.9)
                                .build()
                ))
                .networkAttribution(Map.of(
                        "Periorbital / Ocular Symmetry", 35.0,
                        "Mid-face & Nasal Morphology", 27.0,
                        "Oral / Philtrum Dynamics", 21.0,
                        "Lower Facial Contour", 17.0
                ))
                .facialLandmarks(List.of(
                        Map.of("index", 0, "x", 0.24, "y", 0.38, "region", "Jaw"),
                        Map.of("index", 36, "x", 0.32, "y", 0.36, "region", "Right Eye")
                ))
                .build();
    }

    @Test
    @DisplayName("runImageDiagnosticInference should successfully encode thumbnail, persist report and return DTO")
    void runImageDiagnosticInference_Success() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "facial_photo.jpg",
                "image/jpeg",
                "fake-image-bytes".getBytes()
        );

        when(patientService.findOrCreatePatient(sampleDemographics)).thenReturn(samplePatient);
        when(inferenceClientService.executeImageInference(file, sampleDemographics)).thenReturn(sampleInferenceDTO);

        DiagnosticReport savedEntity = DiagnosticReport.builder()
                .id(42L)
                .patient(samplePatient)
                .predictedClass(1)
                .predictedLabel("Autism Spectrum Disorder")
                .asdProbability(0.88)
                .controlProbability(0.12)
                .confidencePercentage(88.0)
                .imageThumbnailBase64("data:image/jpeg;base64," + java.util.Base64.getEncoder().encodeToString("fake-image-bytes".getBytes()))
                .createdAt(LocalDateTime.now())
                .build();

        when(diagnosticReportRepository.save(any(DiagnosticReport.class))).thenReturn(savedEntity);

        DiagnosticResponseDTO response = diagnosticReportService.runImageDiagnosticInference(file, sampleDemographics);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(42L);
        assertThat(response.getSubjectId()).isEqualTo("PATIENT_IMG_001");
        assertThat(response.getPredictedLabel()).isEqualTo("Autism Spectrum Disorder");
        assertThat(response.getImageThumbnailBase64()).startsWith("data:image/jpeg;base64,");
        assertThat(response.getFacialLandmarks()).hasSize(2);
        assertThat(response.getTopPathways()).hasSize(1);

        verify(patientService, times(1)).findOrCreatePatient(sampleDemographics);
        verify(inferenceClientService, times(1)).executeImageInference(file, sampleDemographics);
        verify(diagnosticReportRepository, times(1)).save(any(DiagnosticReport.class));
    }

    @Test
    @DisplayName("runImageDiagnosticInference should throw IllegalArgumentException when file is empty")
    void runImageDiagnosticInference_EmptyFile_ThrowsException() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> diagnosticReportService.runImageDiagnosticInference(emptyFile, sampleDemographics))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Image file must not be empty");

        verify(patientService, never()).findOrCreatePatient(any());
        verify(inferenceClientService, never()).executeImageInference(any(), any());
        verify(diagnosticReportRepository, never()).save(any());
    }

    @Test
    @DisplayName("runImageDiagnosticInference should throw IllegalArgumentException when file is null")
    void runImageDiagnosticInference_NullFile_ThrowsException() {
        assertThatThrownBy(() -> diagnosticReportService.runImageDiagnosticInference(null, sampleDemographics))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Image file must not be empty");

        verify(patientService, never()).findOrCreatePatient(any());
        verify(inferenceClientService, never()).executeImageInference(any(), any());
        verify(diagnosticReportRepository, never()).save(any());
    }
}
