# ==============================================================================
# NeuroGraph-ASD: Enterprise Java Spring Boot 3 Gateway Backend Dockerfile
# Multi-stage build combining Maven packaging and Eclipse Temurin 17 JRE runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Package with Maven and Eclipse Temurin JDK 17
# ------------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /build

# Copy Maven POM descriptor first to cache downloaded dependencies
COPY pom.xml .

# Download dependencies offline to optimize Docker build caching
RUN mvn dependency:go-offline -B || true

# Copy application source tree
COPY src ./src

# Build production JAR package, skipping tests for fast and deterministic builds
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 2: Lightweight Production Runtime with Eclipse Temurin JRE 17
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Create a dedicated non-privileged user and group for running the service
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install curl for container health monitoring
RUN apk add --no-cache curl

# Copy compiled JAR file from the builder stage
COPY --from=builder /build/target/*.jar /app/neurograph-backend.jar

# Set correct ownership for application directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user for security best practices
USER appuser

# Expose Spring Boot gateway HTTP port
EXPOSE 8080

# Configure default JVM container options and active profile
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

# Healthcheck to verify Spring Boot gateway availability
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the Spring Boot Gateway service
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/neurograph-backend.jar"]
