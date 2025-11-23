# Caresma Frontend

A React application for the Caresma cognitive health assessment platform. Features an AI-powered avatar for real-time voice conversations and cognitive assessment analysis.

## Features

- **AI Avatar Chat**: Real-time voice conversations with HeyGen streaming avatar
- **Speech-to-Text**: OpenAI Realtime API for transcription
- **Cognitive Assessments**: Upload transcripts for AI-powered analysis
- **Assessment Reports**: Visual scores across Memory, Language, Executive Function, and Orientation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Frontend                           │
├─────────────────────────────────────────────────────────────────┤
│  Pages                                                          │
│  ├── Home.js           - Interactive avatar session             │
│  └── AssessmentView.js - Transcript upload & analysis           │
├─────────────────────────────────────────────────────────────────┤
│  Hooks                                                          │
│  ├── useOpenAIWebSocket.js - Audio streaming to backend         │
│  └── useHeygenAvatar.js    - HeyGen avatar management           │
├─────────────────────────────────────────────────────────────────┤
│  Services                                                       │
│  └── assessmentService.js  - Assessment API client              │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Running backend server (see caresma-backend)
- HeyGen API access (for avatar)

## Quick Start

### 1. Install Dependencies

```bash
cd caresma-front
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:8000/api/v1
```

### 3. Start Development Server

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Running the Full Application

You need both the backend and frontend running:

**Terminal 1 - Backend:**
```bash
cd caresma-backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd caresma-front
npm start
```

Then open `http://localhost:3000` in your browser.

## Project Structure

```
src/
├── components/
│   ├── Home.js              # Main interactive session page
│   ├── AssessmentView.js    # Transcript upload page
│   ├── AssessmentResults.js # Assessment results display
│   ├── AssessmentView.css   # Assessment styles
│   └── AssessmentResults.css
├── hooks/
│   ├── useOpenAIWebSocket.js # WebSocket for audio streaming
│   └── useHeygenAvatar.js    # HeyGen avatar SDK integration
├── services/
│   └── assessmentService.js  # API client for assessments
├── App.js                    # Router and navigation
├── App.css                   # Global styles
└── index.js                  # Entry point
```

## Pages

### Home (`/`)
Interactive session with AI avatar:
- Click "Start Session" to initialize avatar
- Wait for avatar greeting
- Click "Start Speaking" to record audio
- Avatar responds with AI-generated text via HeyGen TTS

### Assessment (`/assessment`)
Upload transcript for cognitive analysis:
- Drag & drop or click to upload `.txt` or `.md` file
- Optionally link to existing session ID
- View detailed scores and feedback

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` | UI framework |
| `react-router-dom` | Client-side routing |
| `@heygen/streaming-avatar` | HeyGen avatar SDK |

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
Ejects from Create React App (one-way operation)

## How It Works

### Voice Chat Flow

```
1. User clicks "Start Speaking"
2. Browser captures microphone audio
3. Audio converted to PCM16 @ 24kHz
4. Sent via WebSocket to backend
5. Backend forwards to OpenAI Realtime API
6. OpenAI transcribes + generates response
7. Backend sends text response to frontend
8. Frontend calls avatar.speak(text)
9. HeyGen renders avatar speaking
```

### Assessment Flow

```
1. User uploads transcript file
2. Frontend POSTs to /assessments/analyze-file
3. Backend analyzes with GPT-4
4. Returns scores for 4 cognitive domains
5. Frontend displays visual report
```

## Browser Requirements

- Modern browser with WebSocket support
- Microphone access (for voice chat)
- WebRTC support (for HeyGen avatar video)

## Troubleshooting

### Microphone not working
- Ensure browser has microphone permissions
- Check that no other app is using the microphone
- Try a different browser (Chrome recommended)

### Avatar not loading
- Check HeyGen API key is configured in backend
- Verify backend is running and accessible
- Check browser console for errors

### WebSocket connection failed
- Ensure backend is running on port 8000
- Check CORS settings if using different ports
- Verify `REACT_APP_API_URL` is correct

## License

MIT
