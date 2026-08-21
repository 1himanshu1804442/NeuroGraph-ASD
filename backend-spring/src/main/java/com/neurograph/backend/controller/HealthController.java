package com.neurograph.backend.controller;

import com.neurograph.backend.model.dto.HealthResponseDTO;
import com.neurograph.backend.service.InferenceClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Health Check Controller reporting the readiness of the Spring Boot Gateway and Python AI Sidecar.
 * 
 * Why: Provides a unified health probe for Docker, Kubernetes, and the React clinician header.
 */
@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
@Slf4j
public class HealthController {

    private final InferenceClientService inferenceClientService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealthStatus() {
        log.info("[HealthController] Processing health check probe.");
        HealthResponseDTO aiHealth = inferenceClientService.checkAiEngineHealth();

        boolean isModelReady = Boolean.TRUE.equals(aiHealth.getModelLoaded());

        Map<String, Object> health = new HashMap<>();
        health.put("status", "healthy");
        health.put("gatewayVersion", "1.1.0-SPRING-BOOT");
        health.put("javaVersion", System.getProperty("java.version"));
        health.put("aiEngineStatus", aiHealth.getStatus());
        health.put("modelLoaded", isModelReady);
        health.put("hardwareDevice", aiHealth.getDevice());

        return ResponseEntity.ok(health);
    }
}
