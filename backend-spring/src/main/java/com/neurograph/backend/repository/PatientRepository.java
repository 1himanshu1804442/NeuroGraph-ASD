package com.neurograph.backend.repository;

import com.neurograph.backend.model.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Spring Data JPA Repository for Patient entity.
 * 
 * Why: Provides standard CRUD operations, pagination, and custom query derivation
 * for PostgreSQL data access without manual boilerplate SQL.
 */
@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    /**
     * Finds patient by unique subject identifier (e.g. PEDIATRIC_ASD_01).
     */
    Optional<Patient> findBySubjectId(String subjectId);

    /**
     * Checks if a patient already exists with the given subject identifier.
     */
    boolean existsBySubjectId(String subjectId);
}
