import { useState, useRef, useCallback } from 'react'
import './App.css'
import { VoiceRecorder } from './components/VoiceRecorder'
import { PanicButton } from './components/PanicButton'
import VoiceAgentModal from './components/VoiceAgentModal'

function App() {
  const [transcript, setTranscript] = useState('')
  const [parsedMessages, setParsedMessages] = useState([])
  const [showPanicButton, setShowPanicButton] = useState(false)
  const [emergencyData, setEmergencyData] = useState(null)
  const [aircraftCallsign, setAircraftCallsign] = useState('')
  const [showAgentModal, setShowAgentModal] = useState(false)
  
  // Debounce timer for parse-transcript to avoid spam
  const parseTimerRef = useRef(null)

  const handleTranscriptUpdate = (newTranscript) => {
    setTranscript(newTranscript)
    
    // Debounce parse-transcript calls (wait 500ms after last change)
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current)
    }
    
    if (newTranscript && newTranscript.length > 10) {
      parseTimerRef.current = setTimeout(() => {
        parseTranscript(newTranscript)
      }, 500) // Wait 500ms before parsing
    }
  }

  const parseTranscript = async (text) => {
    try {
      const response = await fetch('http://localhost:8000/api/voice/parse-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      })
      const data = await response.json()
      if (data.success && data.messages) {
        setParsedMessages(data.messages)
      }
    } catch (err) {
      console.error('Failed to parse transcript:', err)
    }
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
    console.log('🚨 [App] Panic button clicked - opening agent modal');
    console.log('📝 [App] Current transcript:', transcript);
    console.log('📋 [App] Emergency data:', emergencyData);
    
    // Open agent modal instead of dismissing
    setShowAgentModal(true)
    
    // Optionally hide panic button while modal is open
    // setShowPanicButton(false)
  }

  const handleAgentModalClose = () => {
    console.log('🔒 [App] Agent modal closed - returning to main screen');
    
    // Close modal
    setShowAgentModal(false)
    
    // Hide panic button after conversation ends
    setShowPanicButton(false)
    setEmergencyData(null)
  }

  // Prepare data for voice agent modal
  const transcriptAnalysis = emergencyData 
    ? `COCKPIT TRANSCRIPT:\n${transcript}\n\nSAFETY ANALYSIS:\n${emergencyData.summary}`
    : '';

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
          {parsedMessages.length > 0 ? (
            <div className="conversation-view">
              {parsedMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`message ${
                    msg.speaker === 'ATC' ? 'message-atc' : 
                    msg.speaker === 'Unknown' ? 'message-unknown' :
                    'message-aircraft'
                  }`}
                >
                  <div className="message-speaker">
                    {msg.speaker === 'ATC' ? (
                      <span className="speaker-label">🗼 ATC {msg.target_callsign ? `→ ${msg.target_callsign}` : ''}</span>
                    ) : msg.speaker === 'Unknown' ? (
                      <span className="speaker-label">👥 Cockpit</span>
                    ) : (
                      <span className="speaker-label">✈️ {msg.speaker}</span>
                    )}
                  </div>
                  <div className="message-text">{msg.text}</div>
                </div>
              ))}
            </div>
          ) : transcript ? (
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

      {/* 🆕 Voice Agent Modal - ElevenLabs conversational agent */}
      <VoiceAgentModal
        visible={showAgentModal}
        transcriptAnalysis={transcriptAnalysis}
        firstPrompt={emergencyData?.agentMessage || ''}
        onClose={handleAgentModalClose}
      />
    </div>
  )
}

export default App

