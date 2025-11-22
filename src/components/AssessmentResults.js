import React from 'react';
import './AssessmentResults.css';

function AssessmentResults({ assessment, onBack }) {
  const getRiskLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return '#10b981';
      case 'moderate':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981'; // Green
    if (score >= 5) return '#f59e0b'; // Amber
    if (score >= 3) return '#fb923c'; // Orange
    return '#ef4444'; // Red
  };

  const renderScoreBar = (score, label, feedback) => {
    return (
      <div className="score-item">
        <div className="score-header">
          <h3 className="score-label">{label}</h3>
          <span className="score-value" style={{ color: getScoreColor(score) }}>
            {score?.toFixed(1) || 'N/A'}/10
          </span>
        </div>
        <div className="score-bar-container">
          <div
            className="score-bar-fill"
            style={{
              width: `${(score || 0) * 10}%`,
              backgroundColor: getScoreColor(score),
            }}
          />
        </div>
        {feedback && (
          <p className="score-feedback">{feedback}</p>
        )}
      </div>
    );
  };

  return (
    <div className="assessment-results">
      <div className="results-container">
        {/* Header */}
        <div className="results-header">
          <button className="back-btn" onClick={onBack}>
            ← Back
          </button>
          <h1>Assessment Results</h1>
          <p className="results-subtitle">Cognitive Assessment Report</p>
        </div>

        {/* Overall Score Card */}
        <div className="overall-card">
          <div className="overall-score-section">
            <h2>Overall Score</h2>
            <div className="overall-score-display">
              <span
                className="overall-score-number"
                style={{ color: getScoreColor(assessment.overall_score) }}
              >
                {assessment.overall_score?.toFixed(1) || 'N/A'}
              </span>
              <span className="overall-score-max">/10</span>
            </div>
            {assessment.risk_level && (
              <div
                className="risk-badge"
                style={{
                  backgroundColor: getRiskLevelColor(assessment.risk_level),
                  color: 'white',
                }}
              >
                Risk Level: {assessment.risk_level.toUpperCase()}
              </div>
            )}
          </div>

          {assessment.overall_feedback && (
            <div className="overall-feedback">
              <h3>Summary</h3>
              <p>{assessment.overall_feedback}</p>
            </div>
          )}
        </div>

        {/* Cognitive Domain Scores */}
        <div className="scores-section">
          <h2>Cognitive Domain Scores</h2>

          {renderScoreBar(
            assessment.memory_score,
            '🧠 Memory',
            assessment.memory_feedback
          )}

          {renderScoreBar(
            assessment.language_score,
            '💬 Language',
            assessment.language_feedback
          )}

          {renderScoreBar(
            assessment.executive_function_score,
            '🎯 Executive Function',
            assessment.executive_function_feedback
          )}

          {renderScoreBar(
            assessment.orientation_score,
            '🧭 Orientation',
            assessment.orientation_feedback
          )}
        </div>

        {/* Score Interpretation Guide */}
        <div className="interpretation-guide">
          <h3>📊 Score Interpretation</h3>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="guide-range" style={{ backgroundColor: '#10b981' }}>
                8-10
              </div>
              <span>Normal cognitive function</span>
            </div>
            <div className="guide-item">
              <div className="guide-range" style={{ backgroundColor: '#f59e0b' }}>
                5-7
              </div>
              <span>Mild impairment (monitoring recommended)</span>
            </div>
            <div className="guide-item">
              <div className="guide-range" style={{ backgroundColor: '#fb923c' }}>
                3-4
              </div>
              <span>Moderate impairment (clinical evaluation recommended)</span>
            </div>
            <div className="guide-item">
              <div className="guide-range" style={{ backgroundColor: '#ef4444' }}>
                0-2
              </div>
              <span>Severe impairment (urgent evaluation needed)</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="metadata-section">
          <p className="metadata-item">
            <strong>Assessment ID:</strong> {assessment.id}
          </p>
          <p className="metadata-item">
            <strong>Session ID:</strong> {assessment.session_id}
          </p>
          <p className="metadata-item">
            <strong>Date:</strong> {new Date(assessment.created_at).toLocaleString()}
          </p>
        </div>

        {/* Actions */}
        <div className="actions-section">
          <button className="action-btn primary" onClick={onBack}>
            Analyze Another Transcript
          </button>
          <button
            className="action-btn secondary"
            onClick={() => window.print()}
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssessmentResults;
