package com.neurograph.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main Entry Point for the NeuroGraph-ASD Spring Boot Enterprise Gateway.
 * 
 * Why: Orchestrates patient clinical records, PostgreSQL data persistence with Spring Data JPA,
 * and acts as the secure clinical API gateway communicating with the Python PyTorch GAT AI sidecar.
 */
@SpringBootApplication
public class NeuroGraphBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(NeuroGraphBackendApplication.class, args);
    }
}
