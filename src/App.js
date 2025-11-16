import './App.css';
import { useState } from 'react';

function App() {
  const [sessionStarted, setSessionStarted] = useState(false);

  const handleStartSession = () => {
    setSessionStarted(true);
    console.log('Session started!');
  };

  return (
    <div className="App">
      <div className="container">
        <div className="avatar-container">
          <div className="avatar-placeholder">
            <p>Avatar will appear here</p>
          </div>
        </div>

        <div className="controls-container">
          <button
            className="start-session-btn"
            onClick={handleStartSession}
          >
            {sessionStarted ? 'Session Active' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
