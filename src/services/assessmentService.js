/**
 * Assessment API Service
 * Handles communication with the cognitive assessment backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

/**
 * Upload a transcript file for cognitive assessment
 * @param {File} file - The transcript file (.txt, .md)
 * @param {string|null} sessionId - Optional session ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Assessment results
 */
export const uploadTranscriptFile = async (file, sessionId = null, token = null) => {
  const formData = new FormData();
  formData.append('file', file);

  if (sessionId) {
    formData.append('session_id', sessionId);
  }

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/assessments/analyze-file`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze transcript');
  }

  return response.json();
};

/**
 * Analyze transcript text for cognitive assessment
 * @param {string} transcript - The transcript text
 * @param {string|null} sessionId - Optional session ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Assessment results
 */
export const analyzeTranscriptText = async (transcript, sessionId = null, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body = { transcript };
  if (sessionId) {
    body.session_id = sessionId;
  }

  const response = await fetch(`${API_BASE_URL}/assessments/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to analyze transcript');
  }

  return response.json();
};

/**
 * Get assessment by ID
 * @param {string} assessmentId - Assessment UUID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} Assessment details
 */
export const getAssessment = async (assessmentId, token = null) => {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch assessment');
  }

  return response.json();
};

/**
 * Get all assessments for a session
 * @param {string} sessionId - Session UUID
 * @param {string} token - Auth token
 * @returns {Promise<Array>} List of assessment summaries
 */
export const getSessionAssessments = async (sessionId, token = null) => {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/assessments/session/${sessionId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch assessments');
  }

  return response.json();
};
