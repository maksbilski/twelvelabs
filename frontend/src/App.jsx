import { useState } from 'react'
import './App.css'
import { VoiceRecorder } from './components/VoiceRecorder'

function App() {
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState(null)

  const handleTranscriptUpdate = (newTranscript) => {
    setTranscript(newTranscript)
  }

  const handleAnalysisUpdate = (newAnalysis) => {
    setAnalysis(newAnalysis)
  }

  return (
    <div className="App">
      {/* Główny ekran z transkrypcją */}
      <div className="transcript-screen">
        <div className="transcript-header">
          <h1>🎤 Real-time Voice Transcription</h1>
          <p className="hint">Kliknij mikrofon i zacznij mówić...</p>
        </div>
        
        <div className="transcript-content">
          {transcript ? (
            <p className="transcript-text">{transcript}</p>
          ) : (
            <p className="transcript-placeholder">
              Transkrypcja pojawi się tutaj...
            </p>
          )}
        </div>
      </div>

      {/* Panel z analizą AI (język) */}
      {analysis && (
        <div className="analysis-panel">
          <div className="analysis-header">
            <span className="analysis-icon">🤖</span>
            <span className="analysis-title">AI Analysis</span>
          </div>
          <div className="analysis-content">
            <div className="analysis-item">
              <span className="analysis-label">Wykryty język:</span>
              <span className="analysis-value">{analysis.language}</span>
            </div>
            {analysis.confidence && (
              <div className="analysis-item">
                <span className="analysis-label">Pewność:</span>
                <span className="analysis-value">{analysis.confidence}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Voice Recorder - pływający przycisk */}
      <VoiceRecorder 
        onTranscriptUpdate={handleTranscriptUpdate}
        onAnalysisUpdate={handleAnalysisUpdate}
      />
    </div>
  )
}

export default App

