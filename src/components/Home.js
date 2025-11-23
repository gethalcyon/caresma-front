import '../App.css';
import { useState, useEffect, useRef } from 'react';
import { useHeygenAvatar } from '../hooks/useHeygenAvatar';
import { useOpenAIWebSocket } from '../hooks/useOpenAIWebSocket';

function Home() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [cleanupStatus, setCleanupStatus] = useState('');
  const [greetingDone, setGreetingDone] = useState(false);

  // Session ID - use ref to avoid re-renders when backend sends UUID
  // The actual UUID is stored here for reference, but we always connect with "new"
  const sessionIdRef = useRef(null);

  // Initialize HeyGen avatar only when session starts
  const {
    videoRef,
    speak,
    closeAvatar,
    ready: avatarReady,
    loading: avatarLoading,
    error: avatarError,
    isSpeaking,
  } = useHeygenAvatar(sessionStarted);

  // Initialize OpenAI WebSocket
  const {
    connected,
    isRecording,
    status: wsStatus,
    startRecording,
    stopRecording,
    setOnTextResponse,
    setOnTranscript,
    setOnSessionCreated,
  // Always connect with "new" - backend will generate and send UUID
  } = useOpenAIWebSocket(sessionStarted ? 'new' : null);

  // Handle text responses from OpenAI -> Send to avatar
  useEffect(() => {
    setOnTextResponse((text) => {
      console.log('💬 AI response received:', text);
      setAiResponse(text);
      speak(text); // Make avatar speak!
    });
  }, [setOnTextResponse, speak]);

  // Handle user input transcripts -> Display in UI
  useEffect(() => {
    setOnTranscript((text) => {
      console.log('🎤 User said:', text);
      setUserTranscript(text);
    });
  }, [setOnTranscript]);

  // Handle session creation from backend - store in ref (no re-render needed)
  useEffect(() => {
    setOnSessionCreated((newSessionId) => {
      console.log('🆔 Session ID received from backend:', newSessionId);
      sessionIdRef.current = newSessionId;
    });
  }, [setOnSessionCreated]);

  // Greet the user when avatar is ready
  useEffect(() => {
    if (avatarReady && connected && !greetingDone) {
      const greetingText = 'Hello Christodoulos, how do you feel today?';
      console.log('👋 Avatar greeting user:', greetingText);
      setAiResponse(greetingText);
      speak(greetingText);
      setGreetingDone(true);
    }
  }, [avatarReady, connected, greetingDone, speak]);

  // Handle session start
  const handleStartSession = () => {
    setSessionStarted(true);
  };

  // Handle session end
  const handleEndSession = async () => {
    if (isRecording) {
      stopRecording();
    }
    // Close avatar session to free up concurrent slot
    await closeAvatar();
    setSessionStarted(false);
    setUserTranscript('');
    setAiResponse('');
    setGreetingDone(false);
    // Reset session ID for next session
    sessionIdRef.current = null;
  };

  // Handle cleanup of all HeyGen sessions
  const handleCleanupSessions = async () => {
    setCleanupStatus('Cleaning up sessions...');
    try {
      const response = await fetch('http://localhost:8000/api/v1/heygen/cleanup-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      const data = await response.json();
      setCleanupStatus(`✅ Closed ${data.sessions_closed} session(s)`);

      // Clear status after 3 seconds
      setTimeout(() => setCleanupStatus(''), 3000);
    } catch (error) {
      console.error('❌ Error cleaning up sessions:', error);
      setCleanupStatus('❌ Cleanup failed');
      setTimeout(() => setCleanupStatus(''), 3000);
    }
  };

  // Determine overall status
  const getStatus = () => {
    if (!sessionStarted) return 'Not started';
    if (avatarLoading) return 'Loading avatar...';
    if (avatarError) return `Avatar error: ${avatarError}`;
    if (!avatarReady) return 'Avatar initializing...';
    if (!connected) return 'Connecting to AI...';
    if (isSpeaking) return 'Avatar is speaking...';
    if (isRecording) return 'Listening...';
    return wsStatus;
  };

  return (
    <div className="App">
      {/* Cleanup Button - Top Left */}
      {!sessionStarted && (
        <button
          className="cleanup-btn-topleft"
          onClick={handleCleanupSessions}
          disabled={!!cleanupStatus}
        >
          🧹 Clean Sessions
        </button>
      )}

      <div className="container">
        {/* Main content area with avatar and conversation side by side */}
        <div className="main-content">
          {/* Avatar Video Section */}
          <div className="avatar-container">
            {sessionStarted ? (
              <div className="video-wrapper">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="avatar-video"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px',
                  }}
                />
                {avatarLoading && (
                  <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Loading avatar...</p>
                  </div>
                )}
                {avatarError && (
                  <div className="error-overlay">
                    <p>❌ {avatarError}</p>
                    <button onClick={handleEndSession}>Retry</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="avatar-placeholder">
                <h2>Welcome to Caresma</h2>
              </div>
            )}

            <div className="status-indicator">
              <span className={`status-dot ${connected && avatarReady ? 'connected' : ''} ${isSpeaking ? 'speaking' : ''}`}></span>
              <span className="status-text">{getStatus()}</span>
            </div>
          </div>

          {/* Conversation Display */}
          {sessionStarted && (
            <div className="conversation-container">
              <div className="conversation-messages">
                {userTranscript && (
                  <div className="message user-message">
                    <strong>You:</strong>
                    <p>{userTranscript}</p>
                  </div>
                )}
                {aiResponse && (
                  <div className="message ai-message">
                    <strong>Assistant:</strong>
                    <p>{aiResponse}</p>
                  </div>
                )}
                {!userTranscript && !aiResponse && (
                  <div className="empty-state">
                    <p>Click "Start Speaking" and speak naturally.</p>
                    <p style={{ fontSize: '14px', marginTop: '10px', color: '#999' }}>
                      The AI will automatically respond when you pause speaking.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="controls-container">
          {!sessionStarted ? (
            <button
              className="start-session-btn"
              onClick={handleStartSession}
            >
              Start Session
            </button>
          ) : (
            <>
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!connected || !avatarReady || avatarLoading || !greetingDone || isSpeaking}
              >
                {isRecording ? '🎤 Listening... (Click to stop)' : '🎤 Start Speaking'}
              </button>
              <button
                className="end-session-btn"
                onClick={handleEndSession}
              >
                End Session
              </button>
            </>
          )}
        </div>

        {/* Cleanup Status */}
        {cleanupStatus && (
          <div className="cleanup-status">
            {cleanupStatus}
          </div>
        )}

        {/* Debug Info (remove in production) */}
        {process.env.NODE_ENV === 'development' && sessionStarted && (
          <div className="debug-info">
            <p>Session ID: {sessionIdRef.current || 'pending...'}</p>
            <p>Avatar Ready: {avatarReady ? '✅' : '❌'}</p>
            <p>WebSocket Connected: {connected ? '✅' : '❌'}</p>
            <p>Is Speaking: {isSpeaking ? '✅' : '❌'}</p>
            <p>Is Recording: {isRecording ? '✅' : '❌'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
