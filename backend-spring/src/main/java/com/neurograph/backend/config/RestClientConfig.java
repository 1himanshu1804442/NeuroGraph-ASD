package com.neurograph.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * RestClient Configuration for synchronous HTTP calls to Python AI Engine.
 * 
 * Why: Spring Boot 3 introduced `RestClient` as the modern, fluent synchronous HTTP client
 * replacing legacy `RestTemplate`. It provides built-in connection timeouts and clean URI builders.
 */
@Configuration
public class RestClientConfig {

    @Value("${neurograph.inference.base-url:http://localhost:8000}")
    private String aiEngineBaseUrl;

    @Bean
    public RestClient aiEngineRestClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(60)); // Allow time for GNNExplainer iterations

        return RestClient.builder()
                .baseUrl(aiEngineBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }
}
