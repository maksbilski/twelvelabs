import { useEffect } from 'react';
import ConversationAgent from './ConversationAgent';
import './VoiceAgentModal.css';

/**
 * VoiceAgentModal - Modal wrapper for ElevenLabs voice agent
 * Opens as full-screen overlay with centered modal box
 * 
 * Props:
 * - visible: Boolean - whether modal is visible
 * - transcriptAnalysis: String - combined transcript + analysis for agent
 * - firstPrompt: String - first message agent should say
 * - onClose: Function - callback when modal closes
 */
function VoiceAgentModal({ visible, transcriptAnalysis, firstPrompt, onClose }) {
  
  // Block body scroll when modal is open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      console.log('🔓 [VoiceAgentModal] Modal opened - body scroll blocked');
    } else {
      document.body.style.overflow = '';
      console.log('🔒 [VoiceAgentModal] Modal closed - body scroll restored');
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && visible) {
        console.log('⌨️ [VoiceAgentModal] ESC pressed - closing modal');
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, onClose]);

  // Handle overlay click (click outside modal)
  const handleOverlayClick = (e) => {
    // Only close if clicked directly on overlay, not on content
    if (e.target === e.currentTarget) {
      console.log('🖱️ [VoiceAgentModal] Overlay clicked - closing modal');
      onClose();
    }
  };

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  return (
    <div 
      className={`voice-agent-modal-overlay ${visible ? 'visible' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-modal-title"
    >
      <div 
        className="voice-agent-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (X) */}
        <button 
          className="voice-agent-modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
          title="Close (ESC)"
        >
          ✕
        </button>

        {/* Agent component */}
        <ConversationAgent
          transcriptAnalysis={transcriptAnalysis}
          firstPrompt={firstPrompt}
          onEnd={onClose}
        />
      </div>
    </div>
  );
}

export default VoiceAgentModal;
