package com.neurograph.backend;

import com.neurograph.backend.exception.ResourceNotFoundException;
import com.neurograph.backend.model.dto.PatientDemographicsDTO;
import com.neurograph.backend.model.dto.PatientRequestDTO;
import com.neurograph.backend.model.dto.PatientResponseDTO;
import com.neurograph.backend.model.entity.Patient;
import com.neurograph.backend.repository.PatientRepository;
import com.neurograph.backend.service.PatientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * No-Mistakes Pipeline Unit Test Suite for PatientService.
 * Uses JUnit 5 and Mockito to verify strict business logic and validation rules
 * before writing implementation code.
 */
@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;

    @InjectMocks
    private PatientService patientService;

    private Patient testPatient;
    private PatientRequestDTO testRequestDto;

    @BeforeEach
    void setUp() {
        // Prepare reusable mock patient entity
        testPatient = Patient.builder()
                .id(1L)
                .subjectId("PATIENT_ASD_001")
                .age(10.5)
                .sex(1)
                .fullScaleIq(108.0)
                .siteId("NYU_CLINIC")
                .createdAt(LocalDateTime.now())
                .reports(new ArrayList<>())
                .build();

        // Prepare test request DTO
        testRequestDto = PatientRequestDTO.builder()
                .subjectId("PATIENT_ASD_001")
                .age(10.5)
                .sex(1)
                .fullScaleIq(108.0)
                .siteId("NYU_CLINIC")
                .build();
    }

    @Test
    @DisplayName("Should successfully create a new patient when subjectId is unique")
    void createPatient_Success() {
        // Given: Subject ID does not exist in repository
        when(patientRepository.existsBySubjectId("PATIENT_ASD_001")).thenReturn(false);
        when(patientRepository.save(any(Patient.class))).thenReturn(testPatient);

        // When: Service is called to create patient
        PatientResponseDTO response = patientService.createPatient(testRequestDto);

        // Then: Correct DTO is returned with mapped fields
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getSubjectId()).isEqualTo("PATIENT_ASD_001");
        assertThat(response.getAge()).isEqualTo(10.5);
        assertThat(response.getSex()).isEqualTo(1);
        assertThat(response.getFullScaleIq()).isEqualTo(108.0);
        assertThat(response.getSiteId()).isEqualTo("NYU_CLINIC");

        // Verify repository interactions
        verify(patientRepository, times(1)).existsBySubjectId("PATIENT_ASD_001");
        verify(patientRepository, times(1)).save(any(Patient.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when creating patient with duplicate subjectId")
    void createPatient_DuplicateSubjectId_ThrowsException() {
        // Given: Subject ID already exists
        when(patientRepository.existsBySubjectId("PATIENT_ASD_001")).thenReturn(true);

        // When & Then: Throws IllegalArgumentException
        assertThatThrownBy(() -> patientService.createPatient(testRequestDto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Patient with subject ID PATIENT_ASD_001 already exists");

        // Verify save was never called
        verify(patientRepository, never()).save(any(Patient.class));
    }

    @Test
    @DisplayName("Should find patient by ID when patient exists")
    void getPatientById_Found() {
        // Given: Patient exists with ID 1
        when(patientRepository.findById(1L)).thenReturn(Optional.of(testPatient));

        // When: Service is queried by ID
        PatientResponseDTO response = patientService.getPatientById(1L);

        // Then: Correct DTO is returned
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getSubjectId()).isEqualTo("PATIENT_ASD_001");
        verify(patientRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when patient ID does not exist")
    void getPatientById_NotFound_ThrowsException() {
        // Given: ID 99 does not exist
        when(patientRepository.findById(99L)).thenReturn(Optional.empty());

        // When & Then: Throws ResourceNotFoundException
        assertThatThrownBy(() -> patientService.getPatientById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Patient not found with id: 99");

        verify(patientRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should return existing patient in findOrCreatePatient when subjectId exists")
    void findOrCreatePatient_ReturnsExisting() {
        // Given: Demographics matching existing patient
        PatientDemographicsDTO demographics = PatientDemographicsDTO.builder()
                .subjectId("PATIENT_ASD_001")
                .age(10.5)
                .sex(1)
                .fullScaleIq(108.0)
                .siteId("NYU_CLINIC")
                .build();

        when(patientRepository.findBySubjectId("PATIENT_ASD_001")).thenReturn(Optional.of(testPatient));

        // When: findOrCreatePatient is called
        Patient result = patientService.findOrCreatePatient(demographics);

        // Then: Returns existing patient without saving
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        verify(patientRepository, times(1)).findBySubjectId("PATIENT_ASD_001");
        verify(patientRepository, never()).save(any(Patient.class));
    }

    @Test
    @DisplayName("Should create and return new patient in findOrCreatePatient when subjectId is new")
    void findOrCreatePatient_CreatesNew() {
        // Given: Demographics with new subjectId
        PatientDemographicsDTO demographics = PatientDemographicsDTO.builder()
                .subjectId("NEW_SUBJECT_002")
                .age(14.0)
                .sex(0)
                .fullScaleIq(115.0)
                .siteId("STANFORD_MED")
                .build();

        Patient newPatient = Patient.builder()
                .id(2L)
                .subjectId("NEW_SUBJECT_002")
                .age(14.0)
                .sex(0)
                .fullScaleIq(115.0)
                .siteId("STANFORD_MED")
                .createdAt(LocalDateTime.now())
                .reports(new ArrayList<>())
                .build();

        when(patientRepository.findBySubjectId("NEW_SUBJECT_002")).thenReturn(Optional.empty());
        when(patientRepository.save(any(Patient.class))).thenReturn(newPatient);

        // When: findOrCreatePatient is called
        Patient result = patientService.findOrCreatePatient(demographics);

        // Then: New entity is persisted and returned
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(2L);
        assertThat(result.getSubjectId()).isEqualTo("NEW_SUBJECT_002");
        verify(patientRepository, times(1)).findBySubjectId("NEW_SUBJECT_002");
        verify(patientRepository, times(1)).save(any(Patient.class));
    }

    @Test
    @DisplayName("Should return all patients mapped to DTOs")
    void getAllPatients_ReturnsList() {
        // Given: Repository contains 1 patient
        when(patientRepository.findAll()).thenReturn(List.of(testPatient));

        // When: getAllPatients is called
        List<PatientResponseDTO> result = patientService.getAllPatients();

        // Then: List with 1 mapped DTO is returned
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSubjectId()).isEqualTo("PATIENT_ASD_001");
        verify(patientRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should delete patient by ID when patient exists")
    void deletePatient_Success() {
        // Given: Patient exists
        when(patientRepository.existsById(1L)).thenReturn(true);
        doNothing().when(patientRepository).deleteById(1L);

        // When: deletePatient is called
        patientService.deletePatient(1L);

        // Then: Repository delete is executed
        verify(patientRepository, times(1)).existsById(1L);
        verify(patientRepository, times(1)).deleteById(1L);
    }
}
