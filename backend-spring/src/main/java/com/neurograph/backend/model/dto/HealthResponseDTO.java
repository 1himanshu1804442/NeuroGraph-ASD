package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Health check response DTO indicating overall Spring backend status, database connectivity,
 * and Python ML microservice readiness.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class HealthResponseDTO {

    @JsonProperty("status")
    private String status;

    @JsonProperty("version")
    private String version;

    @JsonProperty("spring_boot")
    private String springBoot;

    @JsonProperty("python_service_status")
    private String pythonServiceStatus;

    @JsonProperty("model_loaded")
    private Boolean modelLoaded;

    @JsonProperty("device")
    private String device;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;
}
