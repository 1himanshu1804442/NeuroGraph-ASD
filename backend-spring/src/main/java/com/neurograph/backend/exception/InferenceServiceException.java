package com.neurograph.backend.exception;

/**
 * Exception thrown when communication with the Python FastAPI Graph Neural Network inference engine fails.
 * 
 * Why: Encapsulates downstream microservice connectivity errors, timeouts, or bad responses
 * so they can be handled explicitly and mapped to HTTP 502/503 responses without crashing the Spring application.
 */
public class InferenceServiceException extends RuntimeException {

    public InferenceServiceException(String message) {
        super(message);
    }

    public InferenceServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
