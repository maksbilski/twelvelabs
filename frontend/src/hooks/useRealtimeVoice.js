import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe, AudioFormat } from '@elevenlabs/react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Hook do real-time voice input z ElevenLabs Scribe v2 Realtime
 * + Periodic AI analysis co 2 sekundy
 * 
 * Obsługuje:
 * - Pobieranie tokena z backendu
 * - Połączenie z ElevenLabs Scribe
 * - Manualne przechwytywanie audio z mikrofonu (Firefox workaround)
 * - Resampling do 16kHz
 * - Real-time transkrypcję (partial i committed)
 * - Periodic Claude analysis (co 2s)
 */
export function useRealtimeVoice(onAnalysisUpdate) {
  const [isManualMicActive, setIsManualMicActive] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs dla manual audio capture
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const isConnectedRef = useRef(false);
  const sendAudioRef = useRef(null);
  
  // Refs dla periodic analysis
  const analysisIntervalRef = useRef(null);
  const lastAnalyzedTextRef = useRef('');
  const fullTranscriptRef = useRef('');

  /**
   * Periodic analysis - wywołuje Claude co 2 sekundy
   */
  const analyzeTranscript = useCallback(async (text) => {
    if (!text || text.length < 10) return;
    
    // Nie analizuj tego samego tekstu
    if (text === lastAnalyzedTextRef.current) return;
    
    try {
      console.log('🤖 [Analysis] Analyzing:', text.slice(0, 50) + '...');
      
      const response = await fetch(`${API_URL}/api/voice/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      });
      
      const data = await response.json();
      
      if (data.success && onAnalysisUpdate) {
        console.log('✅ [Analysis] Result:', data.language);
        onAnalysisUpdate({
          language: data.language,
          confidence: data.confidence
        });
        lastAnalyzedTextRef.current = text;
      }
      
    } catch (err) {
      console.error('❌ [Analysis] Error:', err);
    }
  }, [onAnalysisUpdate]);

  /**
   * Start periodic analysis (co 2 sekundy)
   */
  const startPeriodicAnalysis = useCallback(() => {
    console.log('⏱️ [Analysis] Starting periodic analysis (every 2s)');
    
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
    
    analysisIntervalRef.current = setInterval(() => {
      const currentText = fullTranscriptRef.current;
      if (currentText) {
        analyzeTranscript(currentText);
      }
    }, 2000); // Co 2 sekundy
  }, [analyzeTranscript]);

  /**
   * Stop periodic analysis
   */
  const stopPeriodicAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
      console.log('⏱️ [Analysis] Stopped periodic analysis');
    }
  }, []);

  /**
   * useScribe - hook z ElevenLabs SDK
   * Łączymy się BEZ wbudowanego mikrofonu (Firefox bug workaround)
   */
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    languageCode: 'pl',
    
    onPartialTranscript: (data) => {
      console.log('📝 [Scribe] Partial:', data.text);
      // Aktualizuj ref z partial
      const committed = scribe.committedTranscripts?.map(s => s.text).join(' ') || '';
      fullTranscriptRef.current = (committed + ' ' + (data.text || '')).trim();
    },
    
    onCommittedTranscript: (data) => {
      console.log('✅ [Scribe] Committed:', data.text);
      // Aktualizuj ref z committed
      const committed = scribe.committedTranscripts?.map(s => s.text).join(' ') || '';
      fullTranscriptRef.current = committed;
    },
    
    onError: (err) => {
      console.error('❌ [Scribe] Error:', err);
      setError(String(err?.message || err || 'Unknown error'));
    },
    
    onConnect: () => {
      console.log('✅ [Scribe] Connected!');
      setError(null);
      startPeriodicAnalysis();
    },
    
    onDisconnect: () => {
      console.log('🔌 [Scribe] Disconnected');
      stopPeriodicAnalysis();
      if (stopManualMicrophoneRef.current) {
        stopManualMicrophoneRef.current();
      }
    },
  });

  // Aktualizuj refy
  useEffect(() => {
    isConnectedRef.current = scribe.isConnected;
    sendAudioRef.current = scribe.sendAudio;
  }, [scribe.isConnected, scribe.sendAudio]);

  /**
   * Resample audio do 16kHz (wymagane przez ElevenLabs)
   */
  const resampleTo16k = useCallback((inputBuffer, inputSampleRate) => {
    const targetSampleRate = 16000;
    const ratio = inputSampleRate / targetSampleRate;
    const outputLength = Math.ceil(inputBuffer.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      output[i] = inputBuffer[srcIndex] || 0;
    }
    
    return output;
  }, []);

  /**
   * Konwertuj Float32Array na Int16Array (PCM)
   */
  const float32ToInt16 = useCallback((float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 32768 : sample * 32767;
    }
    return int16Array;
  }, []);

  /**
   * Konwertuj Int16Array na base64
   */
  const int16ToBase64 = useCallback((int16Array) => {
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  /**
   * Start manual microphone capture
   */
  const startManualMicrophone = useCallback(async () => {
    try {
      console.log('🎙️ [ManualMic] Starting...');
      
      // Uzyskaj dostęp do mikrofonu
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;
      
      // AudioContext z natywnym sample rate
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const nativeSampleRate = audioContext.sampleRate;
      console.log('🎙️ [ManualMic] Sample rate:', nativeSampleRate);
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!isConnectedRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Resample do 16kHz
        const resampled = resampleTo16k(inputData, nativeSampleRate);
        
        // Konwertuj na PCM Int16
        const pcmData = float32ToInt16(resampled);
        
        // Konwertuj na base64
        const base64 = int16ToBase64(pcmData);
        
        // Wyślij przez SDK
        try {
          if (sendAudioRef.current) {
            sendAudioRef.current(base64, { sampleRate: 16000 });
          }
        } catch (err) {
          console.error('❌ [ManualMic] Send error:', err);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsManualMicActive(true);
      console.log('✅ [ManualMic] Started!');
      
    } catch (err) {
      console.error('❌ [ManualMic] Error:', err);
      setError('Nie można uzyskać dostępu do mikrofonu');
      throw err;
    }
  }, [resampleTo16k, float32ToInt16, int16ToBase64]);

  /**
   * Stop manual microphone
   */
  const stopManualMicrophone = useCallback(() => {
    console.log('🛑 [ManualMic] Stopping...');
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsManualMicActive(false);
  }, []);

  // Ref dla stopManualMicrophone (do użycia w callbackach)
  const stopManualMicrophoneRef = useRef(null);
  useEffect(() => {
    stopManualMicrophoneRef.current = stopManualMicrophone;
  }, [stopManualMicrophone]);

  /**
   * Start nagrywania
   */
  const startListening = useCallback(async () => {
    if (scribe.isConnected) {
      console.log('⚠️ Already connected');
      return;
    }
    
    try {
      console.log('🎤 Starting listening...');
      
      // 1. Pobierz token z backendu
      const tokenResponse = await fetch(`${API_URL}/api/voice/token`);
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.success || !tokenData.token) {
        throw new Error(tokenData.error || 'Nie otrzymano tokena');
      }
      
      console.log('🔑 Got token');
      
      // 2. Połącz z ElevenLabs (bez mikrofonu - manual mode)
      await scribe.connect({
        token: tokenData.token,
        audioFormat: AudioFormat.PCM_16000,
        sampleRate: 16000,
      });
      
      console.log('✅ Connected, starting microphone...');
      
      // 3. Start manual microphone
      await startManualMicrophone();
      
      console.log('✅ All started!');
      
    } catch (err) {
      console.error('❌ Start error:', err);
      setError(err.message || 'Błąd uruchamiania nagrywania');
      stopManualMicrophone();
    }
  }, [scribe, startManualMicrophone, stopManualMicrophone]);

  /**
   * Stop nagrywania
   */
  const stopListening = useCallback(() => {
    console.log('🛑 Stopping listening...');
    
    stopManualMicrophone();
    scribe.disconnect();
    
  }, [scribe, stopManualMicrophone]);

  /**
   * Toggle nagrywania
   */
  const toggleListening = useCallback(() => {
    if (scribe.isConnected) {
      stopListening();
    } else {
      startListening();
    }
  }, [scribe.isConnected, startListening, stopListening]);

  // Cleanup przy unmount
  useEffect(() => {
    return () => {
      stopManualMicrophone();
      stopPeriodicAnalysis();
    };
  }, [stopManualMicrophone, stopPeriodicAnalysis]);

  return {
    isListening: scribe.isConnected && isManualMicActive,
    isTranscribing: scribe.isTranscribing,
    status: scribe.status,
    error: error || scribe.error,
    partialTranscript: scribe.partialTranscript,
    committedTranscripts: scribe.committedTranscripts,
    fullTranscript: fullTranscriptRef.current,
    startListening,
    stopListening,
    toggleListening,
  };
}
