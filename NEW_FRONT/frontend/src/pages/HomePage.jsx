import { useNavigate } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  const navigate = useNavigate();

  const handleTestConversation = () => {
    navigate('/conversation');
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>✈️ Aviation Safety Monitoring System</h1>
        <p className="subtitle">Real-time cockpit monitoring with AI intervention</p>
      </header>

      <main className="home-content">
        <div className="status-card">
          <div className="status-indicator">
            <div className="indicator-dot"></div>
            <span>System Ready</span>
          </div>
          <p className="status-description">
            Conversational AI agent is ready for testing
          </p>
        </div>

        <div className="action-section">
          <h2>Test Conversational Agent</h2>
          <p>
            Click the button below to start a conversation with the Safety Officer AI.
            This will simulate an emergency intervention scenario.
          </p>

          <button
            className="test-button"
            onClick={handleTestConversation}
          >
            🎙️ Start Conversation
          </button>
        </div>

        <div className="info-section">
          <h3>How it works:</h3>
          <ol>
            <li>
              <strong>Monitoring:</strong> System continuously listens to cockpit audio
            </li>
            <li>
              <strong>Analysis:</strong> AI analyzes conversations in real-time
            </li>
            <li>
              <strong>Intervention:</strong> Safety officer agent initiates contact when needed
            </li>
            <li>
              <strong>Resolution:</strong> Agent guides pilot to resolve safety issues
            </li>
          </ol>
        </div>

        <div className="tech-stack">
          <p>
            <strong>Tech Stack:</strong> React + Vite | ElevenLabs Conversational AI | FastAPI
          </p>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
