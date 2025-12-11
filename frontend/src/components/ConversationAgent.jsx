import { useEffect, useState, useRef } from 'react';
import { Conversation } from '@elevenlabs/client';
import './ConversationAgent.css';

/**
 * ConversationAgent - ElevenLabs Voice Agent Component
 * Handles real-time conversation with safety officer agent
 * 
 * Props:
 * - transcriptAnalysis: Combined transcript + analysis for agent context
 * - firstPrompt: First message agent should say to pilots
 * - onEnd: Callback when conversation ends
 */
function ConversationAgent({ transcriptAnalysis, firstPrompt, onEnd }) {
  const [conversation, setConversation] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const conversationRef = useRef(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (hasInitialized.current) {
      console.log('⚠️ [ConversationAgent] Already initialized, skipping...');
      return;
    }

    console.log('🚀 [ConversationAgent] Starting conversation...');
    console.log('📋 [ConversationAgent] Transcript Analysis:', transcriptAnalysis?.substring(0, 100) + '...');
    console.log('📢 [ConversationAgent] First Prompt:', firstPrompt);
    
    hasInitialized.current = true;
    startConversation();

    return () => {
      // Cleanup on unmount
      console.log('🧹 [ConversationAgent] Cleaning up conversation...');
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

      console.log('📞 [ConversationAgent] Connecting to safety officer agent...');

      // Agent ID - from env or hardcoded
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || 'agent_4401kc79jma5e189ep8as6wm64mp';
      
      console.log('🤖 [ConversationAgent] Agent ID:', agentId);
      
      // Prepare dynamic variables
      const dynamicVars = {
        transcript_analysis: transcriptAnalysis || '',
        first_prompt: firstPrompt || ''
      };
      
      console.log('🔑 [ConversationAgent] Dynamic Variables FULL:');
      console.log('  📋 transcript_analysis:', dynamicVars.transcript_analysis);
      console.log('  📢 first_prompt:', dynamicVars.first_prompt);
      console.log('  🔍 Variables prepared for agent:', JSON.stringify(dynamicVars, null, 2));

      // Initialize conversation with ElevenLabs agent
      const conv = await Conversation.startSession({
        agentId: agentId,

        // IMPORTANT: Use websocket connection
        connectionType: 'websocket',

        // 🔑 DYNAMIC VARIABLES - Pass context to agent
        // These will be available in agent's System Prompt as {{transcript_analysis}} and {{first_prompt}}
        // IMPORTANT: Configure in ElevenLabs Dashboard:
        // 1. Add dynamic variables: transcript_analysis, first_prompt
        // 2. Set First Message to: {{first_prompt}}
        // 3. System Prompt should use: {{transcript_analysis}}
        dynamicVariables: dynamicVars,

        // Callbacks for events
        onConnect: () => {
          console.log('✅ [ConversationAgent] Connected to agent');
          setStatus('connected');
          
          console.log('ℹ️ [ConversationAgent] Dynamic variables passed:');
          console.log('   📋 transcript_analysis:', dynamicVars.transcript_analysis.substring(0, 100) + '...');
          console.log('   📢 first_prompt:', dynamicVars.first_prompt);
          console.log('');
          console.log('⚠️ [ConversationAgent] Agent should now use {{first_prompt}} from Dashboard config');
          console.log('📋 [ConversationAgent] Make sure in ElevenLabs Dashboard:');
          console.log('   1. Dynamic variables exist: transcript_analysis, first_prompt');
          console.log('   2. First Message is set to: {{first_prompt}}');
          console.log('   3. System Prompt uses: {{transcript_analysis}}');
        },

        onDisconnect: (reason) => {
          console.log('❌ [ConversationAgent] Disconnected from agent. Reason:', reason);
          setStatus('disconnected');
        },

        onError: (error) => {
          console.error('❌ [ConversationAgent] Conversation error:', error);
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
          console.log('📊 [ConversationAgent] Status changed to:', newStatus);
        },

        onModeChange: (mode) => {
          console.log('🔄 [ConversationAgent] Mode changed to:', mode);

          // mode.mode can be: 'speaking', 'listening', 'thinking', etc.
          if (mode.mode === 'speaking') {
            setIsAgentSpeaking(true);
            setIsUserSpeaking(false);
          } else if (mode.mode === 'listening') {
            setIsAgentSpeaking(false);
            setIsUserSpeaking(true);
          }
        },

        onMessage: (message) => {
          console.log('💬 [ConversationAgent] Message:', message);
        }
      });

      console.log('✅ [ConversationAgent] Conversation initialized!');

      conversationRef.current = conv;
      setConversation(conv);
      setStatus('active');

    } catch (err) {
      console.error('❌ [ConversationAgent] Failed to start conversation:', err);
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

  const handleEndConversation = () => {
    console.log('🔚 [ConversationAgent] Ending conversation...');
    
    if (conversationRef.current) {
      conversationRef.current.endSession();
      conversationRef.current = null;
    }
    
    setStatus('disconnected');
    
    // Call parent callback to close modal
    if (onEnd) {
      onEnd();
    }
  };

  return (
    <div className="conversation-agent">
      {/* Header */}
      <div className="agent-header">
        <h2>🎙️ Safety Officer</h2>
        <p className="agent-subtitle">Emergency Voice Assistance</p>

        {/* Status indicator */}
        <div className="agent-status-bar">
          <div className={`agent-status-badge ${status}`}>
            {status === 'connecting' && '🔄 Connecting...'}
            {status === 'connected' && '🟢 Connected'}
            {status === 'active' && '🟢 Active'}
            {status === 'disconnected' && '🔴 Disconnected'}
            {status === 'error' && '❌ Error'}
          </div>
        </div>
      </div>

      <div className="agent-content">
        {/* Loading state */}
        {status === 'connecting' && (
          <div className="agent-loading">
            <div className="agent-spinner"></div>
            <p>Establishing connection with Safety Officer...</p>
            <p className="agent-tip">Make sure to allow microphone access</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="agent-error-message">
            <h3>⚠️ Connection Error</h3>
            <p>{error || 'Failed to connect to agent'}</p>
            <button onClick={startConversation} className="agent-retry-button">
              🔄 Retry Connection
            </button>
          </div>
        )}

        {/* Active conversation */}
        {(status === 'active' || status === 'connected') && (
          <div className="agent-conversation-active">
            {/* Agent participant */}
            <div className={`agent-participant ${isAgentSpeaking ? 'speaking' : ''}`}>
              <div className="agent-avatar agent-avatar-icon">👨‍✈️</div>
              <div className="agent-participant-info">
                <div className="agent-participant-name">Safety Officer</div>
                <div className="agent-participant-state">
                  {isAgentSpeaking ? '🔊 Speaking...' : '👂 Listening...'}
                </div>
              </div>
            </div>

            {/* Visual divider with wave */}
            <div className="agent-divider">
              <div className="agent-wave-container">
                {isAgentSpeaking && <div className="agent-wave agent-speaking-wave"></div>}
                {isUserSpeaking && <div className="agent-wave user-speaking-wave"></div>}
                {!isAgentSpeaking && !isUserSpeaking && <div className="agent-wave idle-wave"></div>}
              </div>
            </div>

            {/* User participant */}
            <div className={`agent-participant ${isUserSpeaking ? 'speaking' : ''}`}>
              <div className="agent-avatar user-avatar-icon">👨‍✈️</div>
              <div className="agent-participant-info">
                <div className="agent-participant-name">You (Pilot)</div>
                <div className="agent-participant-state">
                  {isUserSpeaking ? '🎤 Speaking...' : '👂 Listening...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Disconnected state */}
        {status === 'disconnected' && (
          <div className="agent-disconnected">
            <p>Conversation ended</p>
          </div>
        )}
      </div>

      {/* Footer with controls */}
      <div className="agent-footer">
        <p className="agent-footer-info">
          {status === 'active' && '💬 Speak naturally - the agent will guide you'}
          {status === 'connecting' && '⏳ Connecting to agent...'}
          {status === 'error' && '❌ Connection failed'}
          {status === 'disconnected' && '🔴 Connection closed'}
        </p>
        
        {(status === 'active' || status === 'connected') && (
          <button 
            className="agent-end-button" 
            onClick={handleEndConversation}
            disabled={status === 'disconnected'}
          >
            End Conversation
          </button>
        )}
        
        {status === 'error' && (
          <button className="agent-end-button" onClick={handleEndConversation}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

export default ConversationAgent;
