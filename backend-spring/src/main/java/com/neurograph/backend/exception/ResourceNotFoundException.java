package com.neurograph.backend.exception;

/**
 * Exception thrown when a requested resource (Patient, DiagnosticReport, etc.) cannot be found in the database.
 * 
 * Why: Triggers a clean HTTP 404 Not Found response in GlobalExceptionHandler with a descriptive message.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
