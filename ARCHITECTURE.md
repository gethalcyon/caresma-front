# Caresma Avatar Chat Architecture

This document describes the system architecture for the real-time avatar chatting feature in Caresma.

## System Overview

The avatar chat system enables users to have voice conversations with an AI-powered avatar. The system uses:

- **OpenAI Realtime API** - For speech-to-text and LLM response generation
- **HeyGen Streaming Avatar** - For avatar video rendering and text-to-speech
- **FastAPI Backend** - For WebSocket management and session handling
- **React Frontend** - For user interface and audio capture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND (React)                                      │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐│
│  │                                   Home.js                                            ││
│  │                                                                                      ││
│  │   [Start Session] ──▶ sessionStarted=true ──▶ initializes both hooks               ││
│  │   [Start Mic] ──▶ startRecording()                                                  ││
│  │   [End Session] ──▶ closeAvatar() + stopRecording()                                 ││
│  └─────────────────────────────────────────────────────────────────────────────────────┘│
│           │                                              │                               │
│           ▼                                              ▼                               │
│  ┌─────────────────────────┐                   ┌─────────────────────────┐              │
│  │  useOpenAIWebSocket.js  │                   │   useHeygenAvatar.js    │              │
│  │                         │                   │                         │              │
│  │  • Capture microphone   │   text_response   │  • StreamingAvatar SDK  │              │
│  │  • Stream PCM16 audio ──┼───────────────────┼─▶ avatar.speak(text)   │              │
│  │  • Receive transcript   │                   │  • Render video         │              │
│  │  • Receive AI response  │                   │                         │              │
│  └───────────┬─────────────┘                   └─────────────┬───────────┘              │
│              │                                               │                           │
└──────────────┼───────────────────────────────────────────────┼───────────────────────────┘
               │ WebSocket                                     │ WebRTC
               │ ws://localhost:8000                           │
               ▼                                               ▼
┌──────────────────────────────────────────┐    ┌─────────────────────────────────────────┐
│           BACKEND (FastAPI)              │    │              HeyGen Cloud               │
│                                          │    │                                         │
│  ┌────────────────────────────────────┐  │    │  • Avatar rendering                     │
│  │         websocket.py               │  │    │  • Text-to-speech                       │
│  │                                    │  │    │  • Video streaming                      │
│  │  @websocket("/ws/session/{id}")    │  │    │                                         │
│  │                                    │  │    └─────────────────────────────────────────┘
│  │  1. Accept connection              │  │
│  │  2. Generate session UUID          │  │
│  │  3. Connect to OpenAI              │  │
│  │  4. Set up callbacks               │  │
│  │  5. Main loop:                     │  │
│  │     • Receive audio from frontend  │  │
│  │     • Send to OpenAI service       │  │
│  └──────────────┬─────────────────────┘  │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐  │
│  │       openai_service.py            │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │    Main Operations           │  │  │
│  │  │  • connect() to OpenAI WS    │  │  │
│  │  │  • send_audio() PCM16 data   │  │  │
│  │  │  • start_conversation()      │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  Background Task             │  │  │    ┌─────────────────────────────────────┐
│  │  │  _listen_for_audio()         │◀─┼───┼────│       OpenAI Realtime API          │
│  │  │                              │  │  │    │                                     │
│  │  │  • recv() from OpenAI        │  │  │    │  • Speech-to-text (ASR)             │
│  │  │  • Parse events              │  │  │    │  • LLM response generation          │
│  │  │  • Call callbacks:           │──┼───┼───▶│  • Voice Activity Detection (VAD)  │
│  │  │    - transcript_callback     │  │  │    │                                     │
│  │  │    - text_response_callback  │  │  │    │  Events:                            │
│  │  └──────────────────────────────┘  │  │    │  • response.text.delta              │
│  └────────────────────────────────────┘  │    │  • response.text.done               │
│                 │                        │    │  • conversation.item.input_audio_   │
│                 ▼                        │    │    transcription.completed          │
│  ┌────────────────────────────────────┐  │    └─────────────────────────────────────┘
│  │       MessageService.py            │  │
│  │                                    │  │
│  │  • Save user messages to DB        │  │
│  │  • Save assistant messages to DB   │  │
│  │  • Linked by thread_uuid           │  │
│  └──────────────┬─────────────────────┘  │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐  │
│  │          PostgreSQL DB             │  │
│  │                                    │  │
│  │  messages table:                   │  │
│  │  ├─ id (UUID)                      │  │
│  │  ├─ thread_id (UUID) ◀── session   │  │
│  │  ├─ role (user/assistant)          │  │
│  │  ├─ content (text)                 │  │
│  │  └─ created_at                     │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Data Flow

| Step | From | To | Data |
|------|------|-----|------|
| 1 | User speaks | Microphone | Audio |
| 2 | useOpenAIWebSocket | Backend WS | PCM16 binary (24kHz) |
| 3 | websocket.py | openai_service | Audio bytes |
| 4 | openai_service | OpenAI API | Base64 encoded audio |
| 5 | OpenAI API | openai_service | transcript + text_response |
| 6 | openai_service | MessageService | Save to DB |
| 7 | websocket.py | Frontend WS | JSON events |
| 8 | Home.js | useHeygenAvatar | `speak(text)` |
| 9 | HeyGen SDK | Video element | Avatar video stream |

## Key Components

### Frontend

#### Home.js
The main component that orchestrates the chat experience:
- Manages session state (`sessionStarted`, `sessionId`)
- Coordinates between WebSocket and Avatar hooks
- Displays user transcript and AI responses

#### useOpenAIWebSocket.js
Custom hook for real-time audio streaming:
- Captures microphone audio using Web Audio API
- Converts audio to PCM16 format at 24kHz (OpenAI requirement)
- Streams audio to backend via WebSocket
- Receives and dispatches events via callbacks

#### useHeygenAvatar.js
Custom hook for avatar management:
- Initializes HeyGen StreamingAvatar SDK
- Handles avatar video rendering
- Provides `speak(text)` function for text-to-speech

### Backend

#### websocket.py
WebSocket endpoint handler:
- Accepts connections at `/ws/session/{session_id}`
- Generates UUID for new sessions
- Sets up bidirectional communication
- Forwards audio to OpenAI service
- Saves messages to database via callbacks

#### openai_service.py
OpenAI Realtime API client:
- Maintains WebSocket connection to OpenAI
- Sends audio data for transcription
- Runs background task to receive events
- Dispatches responses via callbacks

Key configuration (session.update):
```python
"turn_detection": {
    "type": "server_vad",      # Server-side voice activity detection
    "threshold": 0.5,          # Speech detection sensitivity
    "prefix_padding_ms": 300,  # Audio buffer before speech
    "silence_duration_ms": 500 # Silence before response triggers
}
```

#### MessageService.py
Database operations:
- Creates message records with thread_id, role, and content
- Links all messages in a session via thread_uuid

## Session Management

1. Frontend connects with `sessionId = "new"`
2. Backend validates and generates a proper UUID
3. Backend sends `session_created` event with the UUID
4. Frontend stores the UUID for the session duration
5. All messages are linked by this UUID in the database

## Concurrent Operations

The backend runs two concurrent async operations:

1. **Main Loop** (websocket.py)
   - Receives audio from frontend
   - Sends to OpenAI service
   - Handles control messages (start/stop recording)

2. **Background Task** (openai_service._listen_for_audio)
   - Receives events from OpenAI
   - Parses response types
   - Calls callbacks to forward to frontend

```python
# Created with asyncio.create_task() for non-blocking execution
self._listen_task = asyncio.create_task(self._listen_for_audio())
```

## External Services

### OpenAI Realtime API
- WebSocket-based real-time speech API
- Handles ASR (Automatic Speech Recognition)
- Generates LLM responses
- Built-in VAD (Voice Activity Detection)

### HeyGen Streaming Avatar
- Cloud-based avatar rendering
- Text-to-speech synthesis
- WebRTC video streaming
- Real-time lip sync
