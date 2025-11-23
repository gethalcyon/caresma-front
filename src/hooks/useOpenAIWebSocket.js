import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook to manage WebSocket connection with OpenAI backend
 * Handles audio streaming and receives text responses
 */
export function useOpenAIWebSocket(sessionId) {
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  const streamRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Not connected');

  // Callbacks
  const onTextResponseRef = useRef(null);
  const onTranscriptRef = useRef(null);
  const onSessionCreatedRef = useRef(null);

  // Track connection state to handle React StrictMode double mounting
  const isConnectingRef = useRef(false);
  // Store the initial sessionId to prevent reconnection when it changes
  const initialSessionIdRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    // Capture the initial sessionId and use it for the connection
    // This prevents reconnection when sessionId changes from "new" to actual UUID
    if (initialSessionIdRef.current === null) {
      initialSessionIdRef.current = sessionId;
    }
    const connectionSessionId = initialSessionIdRef.current;

    // Prevent double connection in React StrictMode
    // Check if we already have an open/connecting WebSocket
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('⏭️ Skipping - WebSocket already open/connecting');
      return;
    }

    // Also check if we're in the middle of connecting
    if (isConnectingRef.current) {
      console.log('⏭️ Skipping - connection already in progress');
      return;
    }

    isConnectingRef.current = true;
    console.log('🔌 Connecting WebSocket with session:', connectionSessionId);

    // petran_12
    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/session/${connectionSessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      isConnectingRef.current = false;
      setConnected(true);
      setStatus('Connected');
    };

    ws.onmessage = (event) => {
      // Handle JSON messages
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Received message:', data);

        if (data.type === 'text_response') {
          // OpenAI generated text response - pass to avatar
          console.log('💬 AI Response:', data.text);
          // petran_14
          onTextResponseRef.current?.(data.text);
        } else if (data.type === 'transcript') {
          // User input transcript - display in UI
          console.log('🎤 User said:', data.text);
          // petran_14
          onTranscriptRef.current?.(data.text);
        } else if (data.type === 'recording_started') {
          setStatus('Recording...');
        } else if (data.type === 'recording_stopped') {
          setStatus('Processing...');
        } else if (data.type === 'session_created') {
          // Backend generated a new session UUID - just store it, don't reconnect
          console.log('🆔 Session created:', data.session_id);
          onSessionCreatedRef.current?.(data.session_id);
        } else if (data.type === 'error') {
          console.error('❌ Backend error:', data.message);
          setStatus(`Error: ${data.message}`);
        }
      } catch (e) {
        console.error('❌ Error parsing message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      isConnectingRef.current = false;
      setStatus('Connection error');
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      isConnectingRef.current = false;
      setConnected(false);
      setStatus('Disconnected');
      wsRef.current = null;
      // Reset so we can reconnect for a new session
      initialSessionIdRef.current = null;
    };

    // Cleanup: only close if this specific ws instance is still the current one
    return () => {
      // Don't close if a newer connection has replaced this one
      if (wsRef.current === ws) {
        console.log('🧹 Cleaning up WebSocket');
        ws.close();
        wsRef.current = null;
        isConnectingRef.current = false;
        initialSessionIdRef.current = null;
      }
    };
  }, [sessionId]);

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting recording...');
      // petran_11
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create audio context with 24kHz sample rate (OpenAI requirement)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000,
        });
      }

      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);

      // Create ScriptProcessor for capturing raw audio
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      let chunkCount = 0;
      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.warn('⚠️ WebSocket not open, cannot send audio');
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 (PCM16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send PCM16 data to backend
        // petran_13
        wsRef.current.send(pcm16.buffer);

        // Log every 50 chunks to avoid console spam
        chunkCount++;
        if (chunkCount % 50 === 0) {
          console.log(`📡 Sent ${chunkCount} audio chunks (${pcm16.buffer.byteLength} bytes each)`);
        }
      };

      // Connect the audio graph
      source.connect(processor);
      processor.connect(audioContext.destination);

      audioProcessorRef.current = processor;
      setIsRecording(true);

      // Notify backend
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'start_recording' }));
      }

      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Microphone access denied:', error);
      setStatus('Microphone access denied');
    }
  }, []);

  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording...');

    setIsRecording(false);

    // Disconnect audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Notify backend
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_recording' }));
    }

    console.log('✅ Recording stopped');
  }, []);

  /**
   * Set callback for when text response is received
   */
  const setOnTextResponse = useCallback((callback) => {
    onTextResponseRef.current = callback;
  }, []);

  /**
   * Set callback for when transcript is received
   */
  const setOnTranscript = useCallback((callback) => {
    onTranscriptRef.current = callback;
  }, []);

  /**
   * Set callback for when session is created by backend
   */
  const setOnSessionCreated = useCallback((callback) => {
    onSessionCreatedRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.disconnect();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    connected,
    isRecording,
    status,
    startRecording,
    stopRecording,
    setOnTextResponse,
    setOnTranscript,
    setOnSessionCreated,
  };
}
