import { useEffect } from 'react';
import { useRealtimeVoice } from '../hooks/useRealtimeVoice';
import './VoiceRecorder.css';

/**
 * Minimalistyczny komponent - tylko przycisk mikrofonu
 * Transkrypcja wyświetla się na głównym ekranie (App.jsx)
 */
export function VoiceRecorder({ onTranscriptUpdate, onAnalysisUpdate, aircraftCallsign }) {
  const {
    isListening,
    error,
    partialTranscript,
    committedTranscripts,
    fullTranscript,
    toggleListening,
  } = useRealtimeVoice(onAnalysisUpdate, aircraftCallsign);

  // Update transcript w App.jsx przy każdej zmianie
  useEffect(() => {
    // Pełna transkrypcja (committed + partial)
    const committed = committedTranscripts && committedTranscripts.length > 0
      ? committedTranscripts.map(segment => segment.text).join(' ')
      : '';
    
    const full = partialTranscript 
      ? (committed + ' ' + partialTranscript).trim()
      : committed;
    
    if (full && onTranscriptUpdate) {
      onTranscriptUpdate(full);
    }
  }, [partialTranscript, committedTranscripts, onTranscriptUpdate]);

  return (
    <div className="voice-recorder-mini">
      {/* Status indicator */}
      {isListening && (
        <div className="status-indicator">
          <span className="wave-bars">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="status-text">Nagrywanie...</span>
        </div>
      )}
      
      {/* Error toast */}
      {error && (
        <div className="error-toast">
          ⚠️ {error}
        </div>
      )}
      
      {/* Główny przycisk mikrofonu */}
      <button
        className={`voice-btn-mini ${isListening ? 'listening' : ''}`}
        onClick={toggleListening}
        aria-label={isListening ? 'Zatrzymaj nagrywanie' : 'Rozpocznij nagrywanie'}
      >
        <span className="mic-icon">
          {isListening ? (
            // Stop icon
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            // Mic icon
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
