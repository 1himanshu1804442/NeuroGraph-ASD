package com.neurograph.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Standardized error response payload returned by GlobalExceptionHandler.
 * 
 * Why: Provides consistent, readable error structures across all endpoints for frontend clients,
 * including precise field-level validation error maps to make debugging effortless.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponseDTO {

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("status")
    private Integer status;

    @JsonProperty("error")
    private String error;

    @JsonProperty("message")
    private String message;

    @JsonProperty("path")
    private String path;

    @JsonProperty("validation_errors")
    private Map<String, String> validationErrors;
}
