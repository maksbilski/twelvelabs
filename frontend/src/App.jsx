import { useState } from 'react'
import './App.css'
import { VoiceRecorder } from './components/VoiceRecorder'
import { PanicButton } from './components/PanicButton'

function App() {
  const [transcript, setTranscript] = useState('')
  const [showPanicButton, setShowPanicButton] = useState(false)
  const [emergencyData, setEmergencyData] = useState(null)
  const [aircraftCallsign, setAircraftCallsign] = useState('')

  const handleTranscriptUpdate = (newTranscript) => {
    setTranscript(newTranscript)
  }

  const handleCallsignChange = (e) => {
    setAircraftCallsign(e.target.value)
  }

  const handleAnalysisUpdate = (analysis) => {
    // Pilots Advisor - show panic button if intervention needed
    if (analysis && analysis.needsIntervention) {
      console.log('🚨 [App] INTERVENTION NEEDED - Showing panic button');
      console.log('📋 [App] Summary:', analysis.summary);
      console.log('📢 [App] Agent Message:', analysis.agentMessage);
      
      setShowPanicButton(true)
      setEmergencyData({
        summary: analysis.summary,
        agentMessage: analysis.agentMessage,
        timestamp: analysis.timestamp
      })
    }
  }

  const handlePanicButtonClick = () => {
    console.log('🚨 [App] Panic button clicked');
    console.log('📝 [App] Current transcript:', transcript);
    // TODO: Future implementation - show modal with full transcript
    // For now, just dismiss the panic button
    setShowPanicButton(false)
    setEmergencyData(null)
  }

  return (
    <div className="App">
      {/* Główny ekran z transkrypcją */}
      <div className="transcript-screen">
        <div className="transcript-header">
          <h1>✈️ Cockpit Safety Monitor</h1>
          <div className="callsign-input-container">
            <label htmlFor="callsign-input">Your Aircraft Callsign:</label>
            <input
              id="callsign-input"
              type="text"
              className="callsign-input"
              value={aircraftCallsign}
              onChange={handleCallsignChange}
              placeholder="e.g., Skyline 24 Alpha"
            />
          </div>
          <p className="hint">Click microphone and start speaking (English)...</p>
        </div>
        
        <div className="transcript-content">
          {transcript ? (
            <p className="transcript-text">{transcript}</p>
          ) : (
            <p className="transcript-placeholder">
              Cockpit conversation transcript will appear here...
            </p>
          )}
        </div>
      </div>

      {/* Panic Button - Pilots Advisor Alert */}
      <PanicButton 
        visible={showPanicButton}
        onClick={handlePanicButtonClick}
        emergencyData={emergencyData}
      />
      
      {/* Voice Recorder - pływający przycisk */}
      <VoiceRecorder 
        onTranscriptUpdate={handleTranscriptUpdate}
        onAnalysisUpdate={handleAnalysisUpdate}
        aircraftCallsign={aircraftCallsign}
      />
    </div>
  )
}

export default App

