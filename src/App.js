import './App.css';
import { useState, useRef, useEffect } from 'react';

function App() {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Ready');

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // WebSocket connection
  const connectWebSocket = () => {
    const sessionId = `session-${Date.now()}`;
    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/session/${sessionId}`);

    ws.onopen = () => {
      console.log('✓ WebSocket connected');
      setIsConnected(true);
      setStatus('Connected to AI');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('← Received:', data);

        if (data.type === 'recording_started') {
          setStatus('Recording...');
        } else if (data.type === 'recording_stopped') {
          setStatus('Processing...');
        } else if (data.type === 'error') {
          setStatus(`Error: ${data.message}`);
        }
      } catch (e) {
        console.log('← Binary data received:', event.data);
      }
    };

    ws.onerror = (error) => {
      console.error('✗ WebSocket error:', error);
      setStatus('Connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
      setStatus('Disconnected');
    };

    wsRef.current = ws;
  };

  // Request microphone permission and start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✓ Microphone access granted');

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Send audio chunk to backend
          wsRef.current.send(event.data);
          console.log(`→ Sent ${event.data.size} bytes of audio`);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('✓ Recording started');
        setIsRecording(true);

        // Notify backend
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'start_recording' }));
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped');
        setIsRecording(false);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Notify backend
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop_recording' }));
        }
      };

      mediaRecorderRef.current = mediaRecorder;

      // Start recording in 1-second chunks
      mediaRecorder.start(1000);

    } catch (error) {
      console.error('✗ Microphone access denied:', error);
      setStatus('Microphone access denied');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle session start
  const handleStartSession = () => {
    if (!sessionStarted) {
      setSessionStarted(true);
      setStatus('Connecting...');
      connectWebSocket();
    }
  };

  // Handle recording toggle
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="avatar-container">
          <div className="avatar-placeholder">
            <p>Avatar will appear here</p>
          </div>
          <div className="status-indicator">
            <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
            <span className="status-text">{status}</span>
          </div>
        </div>

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
                onClick={toggleRecording}
                disabled={!isConnected}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
              <button
                className="end-session-btn"
                onClick={() => {
                  stopRecording();
                  if (wsRef.current) wsRef.current.close();
                  setSessionStarted(false);
                  setStatus('Session ended');
                }}
              >
                End Session
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
