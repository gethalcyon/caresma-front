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

  // Initialize WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/session/${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
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
          onTextResponseRef.current?.(data.text);
        } else if (data.type === 'transcript') {
          // User input transcript - display in UI
          console.log('🎤 User said:', data.text);
          onTranscriptRef.current?.(data.text);
        } else if (data.type === 'recording_started') {
          setStatus('Recording...');
        } else if (data.type === 'recording_stopped') {
          setStatus('Processing...');
        } else if (data.type === 'session_created') {
          // Backend generated a new session UUID
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
      setStatus('Connection error');
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
      setStatus('Disconnected');
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting recording...');

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
