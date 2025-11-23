import { useEffect, useRef, useState, useCallback } from "react";
import StreamingAvatar, { AvatarQuality, StreamingEvents } from "@heygen/streaming-avatar";

/**
 * Hook to manage HeyGen Streaming Avatar
 * Handles avatar initialization, video streaming, and text-to-speech
 */
export function useHeygenAvatar(shouldInitialize = false) {
  const videoRef = useRef(null);
  const avatarRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!shouldInitialize) return;

    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      try {
        console.log('🎬 Initializing HeyGen avatar...');

        // 1. Get session token from backend
        const res = await fetch('http://localhost:8000/api/v1/heygen/session-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to get HeyGen token: ${res.statusText}`);
        }

        const { token } = await res.json();
        console.log('✅ Got HeyGen session token');

        if (cancelled) return;

        // 2. Create StreamingAvatar instance
        // petran_15
        const avatar = new StreamingAvatar({ token });
        avatarRef.current = avatar;

        // 3. Set up event listeners
        avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
          console.log('🗣️ Avatar started talking');
          setIsSpeaking(true);
        });

        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          console.log('🤐 Avatar stopped talking');
          setIsSpeaking(false);
        });

        avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
          console.log('📡 Avatar stream disconnected');
          setReady(false);
        });

        avatar.on(StreamingEvents.STREAM_READY, () => {
          console.log('✅ Avatar stream ready');
        });

        // 4. Start avatar session
        console.log('🚀 Creating avatar session...');
        const sessionData = await avatar.createStartAvatar({
          quality: AvatarQuality.Medium,
          avatarName: "default", // Use default avatar or specify avatar_id
          // voice: {
          //   voiceId: "your_voice_id" // Optional: specify voice
          // }
        });

        console.log('✅ Avatar session created:', sessionData);

        // 5. Attach video stream to <video> element
        if (videoRef.current && avatar.mediaStream) {
          videoRef.current.srcObject = avatar.mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch((e) => {
              console.error('❌ Error playing video:', e);
              setError('Failed to play video. Please click to start.');
            });
          };
        }

        setReady(true);
        console.log('🎉 Avatar ready!');

      } catch (e) {
        console.error('❌ Error initializing HeyGen avatar:', e);
        setError(e.message || 'Failed to initialize avatar');
      } finally {
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (avatarRef.current) {
        avatarRef.current.stopAvatar().catch(console.error);
      }
    };
  }, [shouldInitialize]);

  /**
   * Make the avatar speak the given text
   * @param {string} text - Text for avatar to speak
   */
  const speak = useCallback(async (text) => {
    if (!avatarRef.current || !ready) {
      console.warn('⚠️ Avatar not ready, cannot speak');
      return false;
    }

    if (!text || !text.trim()) {
      console.warn('⚠️ Empty text provided');
      return false;
    }

    try {
      console.log('📢 Avatar speaking:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      await avatarRef.current.speak({
        text,
        taskType: "repeat", // Use "repeat" to speak exact text without LLM processing
      });
      console.log('✅ Avatar speak command sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error making avatar speak:', error);
      setError(error.message || 'Failed to make avatar speak');
      return false;
    }
  }, [ready]);

  /**
   * Stop avatar from speaking
   */
  const stopSpeaking = useCallback(async () => {
    if (!avatarRef.current) return;

    try {
      await avatarRef.current.interrupt();
      console.log('🛑 Avatar interrupted');
    } catch (error) {
      console.error('❌ Error interrupting avatar:', error);
    }
  }, []);

  /**
   * Manually close avatar session
   */
  const closeAvatar = useCallback(async () => {
    if (!avatarRef.current) return;

    try {
      console.log('🔌 Closing avatar session...');
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
      setReady(false);
      setIsSpeaking(false);
      console.log('✅ Avatar session closed');
    } catch (error) {
      console.error('❌ Error closing avatar:', error);
    }
  }, []);

  return {
    videoRef,
    speak,
    stopSpeaking,
    closeAvatar,
    ready,
    loading,
    error,
    isSpeaking,
  };
}
