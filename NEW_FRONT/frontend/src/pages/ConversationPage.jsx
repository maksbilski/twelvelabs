import { useEffect, useState, useRef } from 'react';
import { Conversation } from '@elevenlabs/client';
import './ConversationPage.css';

function ConversationPage() {
  const [conversation, setConversation] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const conversationRef = useRef(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) {
      console.log('⚠️ Already initialized, skipping...');
      return;
    }

    console.log('🚀 Component mounted, starting conversation...');
    hasInitialized.current = true;
    startConversation();

    return () => {
      // Cleanup on unmount
      console.log('🧹 Cleaning up conversation...');
      if (conversationRef.current) {
        conversationRef.current.endSession();
        conversationRef.current = null;
      }
    };
  }, []);

  const startConversation = async () => {
    try {
      setStatus('connecting');
      setError(null);

      console.log('📞 Starting conversation with agent...');

      // Initialize conversation with callbacks
      const conv = await Conversation.startSession({
        agentId: 'agent_4401kc79jma5e189ep8as6wm64mp',

        // IMPORTANT: Specify connection type
        connectionType: 'websocket', // or 'webrtc'

        // Callbacks for events
        onConnect: () => {
          console.log('✅ Connected to agent');
          setStatus('connected');

          // Send contextual update about the situation
          console.log('📤 Sending contextual update...');
          setTimeout(() => {
            try {
              // Send context about aircraft situation
              if (conversationRef.current) {
                conversationRef.current.sendContextualUpdate(
                  "SITUATION UPDATE: Aircraft is currently flying with landing gear deployed at cruise altitude. This is abnormal - gear should be retracted. Pilot may have forgotten to retract after takeoff. You are a safety officer - alert the pilot about this and guide them to retract the gear."
                );
                console.log('✅ Context sent!');
              }
            } catch (error) {
              console.error('❌ Failed to send context:', error);
            }
          }, 500); // Small delay to ensure connection is fully established
        },

        onDisconnect: (reason) => {
          console.log('❌ Disconnected from agent. Reason:', reason);
          setStatus('disconnected');
        },

        onError: (error) => {
          console.error('❌ Conversation error:', error);
          console.error('Error details:', {
            message: error.message,
            type: error.type,
            stack: error.stack,
            raw: error
          });
          setError(error.message || String(error));
          setStatus('error');
        },

        onStatusChange: (newStatus) => {
          console.log('📊 Status changed to:', newStatus);
        },

        onModeChange: (mode) => {
          console.log('🔄 Mode changed to:', mode);

          // mode.mode can be: 'speaking', 'listening', 'thinking', etc.
          if (mode.mode === 'speaking') {
            setIsAgentSpeaking(true);
            setIsUserSpeaking(false);
          } else if (mode.mode === 'listening') {
            setIsAgentSpeaking(false);
          }
        },

        onMessage: (message) => {
          console.log('💬 Message:', message);
        }
      });

      console.log('✅ Conversation initialized!');

      conversationRef.current = conv;
      setConversation(conv);
      setStatus('active');

    } catch (err) {
      console.error('❌ Failed to start conversation:', err);
      console.error('Full error object:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        raw: err
      });
      setError(err.message || 'Failed to connect to agent');
      setStatus('error');
    }
  };

  return (
    <div className="conversation-page">
      <header className="conversation-header">
        <h1>🎙️ AI Voice Agent</h1>
        <p className="subtitle">Speak naturally - the agent will respond</p>

        {/* Status indicator */}
        <div className="status-bar">
          <div className={`status-badge ${status}`}>
            {status === 'connecting' && '🔄 Connecting...'}
            {status === 'connected' && '🟢 Connected'}
            {status === 'active' && '🟢 Active'}
            {status === 'disconnected' && '🔴 Disconnected'}
            {status === 'error' && '❌ Error'}
          </div>
        </div>
      </header>

      <div className="conversation-container">
        {/* Loading state */}
        {(status === 'connecting') && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Establishing connection with Safety Officer...</p>
            <p className="tip">Make sure to allow microphone access</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="error-message">
            <h3>⚠️ Connection Error</h3>
            <p>{error || 'Failed to connect to agent'}</p>
            <button onClick={startConversation} className="retry-button">
              🔄 Retry Connection
            </button>
          </div>
        )}

        {/* Active conversation */}
        {(status === 'active' || status === 'connected') && (
          <div className="conversation-active">
            {/* Agent status */}
            <div className={`participant ${isAgentSpeaking ? 'speaking' : ''}`}>
              <div className="avatar agent-avatar">👨‍✈️</div>
              <div className="participant-info">
                <div className="name">Safety Officer</div>
                <div className="state">
                  {isAgentSpeaking ? '🔊 Speaking...' : '👂 Listening...'}
                </div>
              </div>
            </div>

            {/* Visual divider */}
            <div className="divider">
              <div className="wave-container">
                {isAgentSpeaking && <div className="wave agent-wave"></div>}
                {isUserSpeaking && <div className="wave user-wave"></div>}
                {!isAgentSpeaking && !isUserSpeaking && <div className="wave idle-wave"></div>}
              </div>
            </div>

            {/* User status */}
            <div className={`participant ${isUserSpeaking ? 'speaking' : ''}`}>
              <div className="avatar user-avatar">👨‍✈️</div>
              <div className="participant-info">
                <div className="name">You (Pilot)</div>
                <div className="state">
                  {isUserSpeaking ? '🎤 Speaking...' : '👂 Listening...'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="conversation-footer">
        <p className="info">
          {status === 'active' && '💬 Conversation active - speak naturally'}
          {status === 'connecting' && '⏳ Connecting to agent...'}
          {status === 'error' && '❌ Connection failed'}
        </p>
        {error && (
          <button onClick={startConversation} className="retry-button">
            🔄 Retry
          </button>
        )}
      </footer>
    </div>
  );
}

export default ConversationPage;
