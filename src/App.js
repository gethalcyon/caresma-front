import './App.css';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './components/Home';
import AssessmentView from './components/AssessmentView';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <h1>Caresma</h1>
      </div>
      <div className="nav-links">
        <Link
          to="/"
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          🏠 Home
        </Link>
        <Link
          to="/assessment"
          className={`nav-link ${location.pathname === '/assessment' ? 'active' : ''}`}
        >
          🧠 Assessment
        </Link>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assessment" element={<AssessmentView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
