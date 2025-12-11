import { useState } from 'react';
import './PanicButton.css';

/**
 * Panic Button - wyświetla się gdy system wykryje potrzebę interwencji
 * Shows emergency instructions from Gemini AI
 * Expert Pilots Advisor alert
 */
export function PanicButton({ visible, onClick, emergencyData }) {
  const [showSummary, setShowSummary] = useState(false);
  
  if (!visible) return null;
  
  return (
    <div className="panic-button-container">
      <div className="panic-button-wrapper">
        <div className="emergency-header">
          <div className="panic-icon-large">⚠️</div>
          <h2 className="emergency-title">EMERGENCY - INTERVENTION REQUIRED</h2>
        </div>
        
        {/* Agent Instructions - Main Message */}
        {emergencyData?.agentMessage && (
          <div className="agent-instructions">
            <h3 className="instructions-label">🎙️ Agent Instructions:</h3>
            <div className="agent-message">
              {emergencyData.agentMessage}
            </div>
          </div>
        )}
        
        {/* Context Summary - Collapsible */}
        {emergencyData?.summary && (
          <div className="summary-section">
            <button 
              className="summary-toggle"
              onClick={() => setShowSummary(!showSummary)}
            >
              {showSummary ? '▼' : '▶'} Context Summary
            </button>
            
            {showSummary && (
              <div className="summary-content">
                {emergencyData.summary}
              </div>
            )}
          </div>
        )}
        
        {/* Action Button */}
        <button className="panic-button-dismiss" onClick={onClick}>
          Acknowledge & Dismiss
        </button>
        
        {/* Fallback if no emergency data */}
        {!emergencyData && (
          <div className="emergency-fallback">
            <p className="panic-subtitle">Pilots Advisor detected a potential issue</p>
            <button className="panic-button" onClick={onClick}>
              <span className="panic-icon">⚠️</span>
              <span className="panic-text">ATTENTION REQUIRED</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
