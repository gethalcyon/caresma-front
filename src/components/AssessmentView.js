import React, { useState } from 'react';
import { uploadTranscriptFile } from '../services/assessmentService';
import AssessmentResults from './AssessmentResults';
import './AssessmentView.css';

function AssessmentView() {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    // Validate file type
    const allowedTypes = ['.txt', '.md', '.text'];
    const fileExt = '.' + selectedFile.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      setError(`Invalid file type. Please upload ${allowedTypes.join(', ')} files only.`);
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setAssessment(null);

    try {
      // Upload file and get assessment
      const result = await uploadTranscriptFile(
        file,
        sessionId || null,
        null // TODO: Add auth token when auth is implemented
      );

      console.log('Assessment completed:', result);
      setAssessment(result);
    } catch (err) {
      console.error('Assessment failed:', err);
      setError(err.message || 'Failed to analyze transcript. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSessionId('');
    setAssessment(null);
    setError(null);
  };

  // Show results if assessment is complete
  if (assessment) {
    return <AssessmentResults assessment={assessment} onBack={handleReset} />;
  }

  return (
    <div className="assessment-view">
      <div className="assessment-container">
        <h1>Cognitive Assessment</h1>
        <p className="subtitle">
          Upload a conversation transcript to receive a detailed cognitive assessment
        </p>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* Session ID (Optional) */}
          <div className="form-group">
            <label htmlFor="sessionId">
              Session ID (Optional)
              <span className="label-hint">Leave empty to auto-generate</span>
            </label>
            <input
              type="text"
              id="sessionId"
              placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="session-input"
            />
          </div>

          {/* File Upload */}
          <div
            className={`file-upload-area ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-input"
              accept=".txt,.md,.text"
              onChange={handleFileChange}
              className="file-input"
            />

            <label htmlFor="file-input" className="file-label">
              {file ? (
                <div className="file-selected">
                  <div className="file-icon">📄</div>
                  <div className="file-info">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <button
                    type="button"
                    className="remove-file-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div className="upload-icon">📤</div>
                  <p className="upload-text">
                    <strong>Click to upload</strong> or drag and drop
                  </p>
                  <p className="upload-hint">
                    Supported formats: TXT, MD (Max 10MB)
                  </p>
                </>
              )}
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={!file || loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Analyzing Transcript...
              </>
            ) : (
              'Analyze Transcript'
            )}
          </button>

          {loading && (
            <p className="loading-note">
              This may take 30-60 seconds. Please wait...
            </p>
          )}
        </form>

        {/* Info Section */}
        <div className="info-section">
          <h3>📋 What to Expect</h3>
          <ul>
            <li>
              <strong>Memory:</strong> Assessment of recall and repetition patterns
            </li>
            <li>
              <strong>Language:</strong> Evaluation of vocabulary and coherence
            </li>
            <li>
              <strong>Executive Function:</strong> Analysis of reasoning and logic
            </li>
            <li>
              <strong>Orientation:</strong> Awareness of time, place, and context
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AssessmentView;
