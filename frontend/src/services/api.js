/**
 * API Service for NeuroGraph-ASD Clinical Workflow.
 * 
 * Encapsulates all backend REST communications with the Java Spring Boot service.
 * Follows the project's strict API Separation principle: all HTTP operations
 * are defined in this service layer rather than in UI components for testability,
 * debuggability, and maintainability.
 */

// Base URL defaults to '/api' for Vite reverse proxying to Spring Boot on port 8080
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  '/api';

/**
 * Checks system health, Spring Boot service status, and GAT model readiness.
 * Target Endpoint: GET /api/v1/health
 * 
 * @returns {Promise<Object>} Health status payload including status, version, and engine state.
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/health`);
    if (!response.ok) {
      throw new Error(`Health check HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[NeuroGraph API] Backend health check unreachable:', error.message);
    throw error;
  }
}

/**
 * Fetches pre-configured clinical sample benchmark cases from the server.
 * Target Endpoint: GET /api/v1/samples
 * 
 * @returns {Promise<Array>} List of benchmark clinical cases for instant clinician testing.
 */
export async function fetchSampleCases() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/samples`);
    if (!response.ok) {
      throw new Error(`Fetch samples HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Support both direct array format or wrapped object `{ cases: [...] }`
    return Array.isArray(data) ? data : (data.cases || []);
  } catch (error) {
    console.warn('[NeuroGraph API] Failed to fetch sample clinical cases:', error.message);
    throw error;
  }
}

/**
 * Submits patient phenotypic data & connectome matrix for diagnostic inference and XAI biomarker extraction.
 * Target Endpoint: POST /api/v1/predict
 * 
 * @param {Object} payload - { demographics: { subject_id, age, sex, full_scale_iq, site_id }, preset_case, fc_matrix }
 * @returns {Promise<Object>} Diagnostic decision, probabilities, top pathways, and connectome graph.
 */
export async function predictDiagnosis(payload) {
  try {
    console.info(
      '[NeuroGraph API] Submitting diagnostic inference request for subject:',
      payload?.demographics?.subject_id || 'Unknown'
    );

    const response = await fetch(`${API_BASE_URL}/v1/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Inference HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.info(
      '[NeuroGraph API] Diagnostic screening successful:',
      data.predicted_label,
      `(${data.confidence_percentage ?? (data.asd_probability ? (data.asd_probability * 100).toFixed(1) : 'N/A')}%)`
    );
    return data;
  } catch (error) {
    console.error('[NeuroGraph API Error] Diagnostic prediction failed:', error);
    throw error;
  }
}

/**
 * Fetches historical patient records persisted in the PostgreSQL database.
 * Target Endpoint: GET /api/v1/patients
 * 
 * @returns {Promise<Array>} List of registered patient entities and diagnostic history.
 */
export async function fetchPatientHistory() {
  try {
    console.info('[NeuroGraph API] Fetching historical patient records from PostgreSQL...');
    const response = await fetch(`${API_BASE_URL}/v1/patients`);

    if (!response.ok) {
      throw new Error(`Fetch patient history HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Handle both direct array and wrapped page/content objects (Spring Data Page or custom DTO)
    const records = Array.isArray(data)
      ? data
      : (data.patients || data.content || []);

    console.info(`[NeuroGraph API] Successfully retrieved ${records.length} patient records.`);
    return records;
  } catch (error) {
    console.warn('[NeuroGraph API Warning] Failed to fetch patient history from backend:', error.message);
    throw error;
  }
}

/**
 * Fetches previous diagnostic reports and explainability summaries from PostgreSQL.
 * Target Endpoint: GET /api/v1/reports
 * 
 * @returns {Promise<Array>} List of generated diagnostic screening reports.
 */
export async function fetchDiagnosticReports() {
  try {
    console.info('[NeuroGraph API] Fetching diagnostic reports from PostgreSQL...');
    const response = await fetch(`${API_BASE_URL}/v1/reports`);

    if (!response.ok) {
      throw new Error(`Fetch diagnostic reports HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const reports = Array.isArray(data)
      ? data
      : (data.reports || data.content || []);

    console.info(`[NeuroGraph API] Successfully retrieved ${reports.length} diagnostic reports.`);
    return reports;
  } catch (error) {
    console.warn('[NeuroGraph API Warning] Failed to fetch diagnostic reports:', error.message);
    throw error;
  }
}
