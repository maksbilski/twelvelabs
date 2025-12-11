# 🎙️ ElevenLabs Agent - Instrukcja Konfiguracji

## ✅ NOWA IMPLEMENTACJA - Overrides (LEPSZE ROZWIĄZANIE!)

Kod został zaktualizowany i teraz używa **`overrides`** zamiast polegać na konfiguracji Dashboard!

```javascript
Conversation.startSession({
  agentId: 'agent_4401kc79jma5e189ep8as6wm64mp',
  
  // Dynamic variables dla dodatkowego kontekstu
  dynamicVariables: {
    transcript_analysis: transcriptAnalysis,
    first_prompt: firstPrompt
  },
  
  // 🎯 OVERRIDES - Dynamiczne ustawienie first message i prompt
  overrides: {
    agent: {
      firstMessage: firstPrompt,  // ← Agent powie to AUTOMATYCZNIE!
      prompt: {
        prompt: `System prompt z pełnym kontekstem...`
      },
      language: 'en'
    }
  }
})
```

### 🎉 Zalety tego rozwiązania:
- ✅ **Nie wymaga konfiguracji w Dashboard**
- ✅ Agent **automatycznie** mówi `firstPrompt` po połączeniu
- ✅ Pełny kontekst sytuacji w system prompt
- ✅ Wszystko w kodzie - łatwiejsze debugowanie
- ✅ Działa out-of-the-box

## ⚙️ Konfiguracja w ElevenLabs Dashboard (OPCJONALNA)

### Krok 1: Otwórz Agenta
1. Przejdź do: https://elevenlabs.io/app/conversational-ai
2. Znajdź agenta o ID: `agent_4401kc79jma5e189ep8as6wm64mp`
3. Kliknij "Edit" / "Settings"

---

### Krok 2: Dodaj Dynamic Variables

W panelu bocznym znajdź sekcję **"Personalization"** → **"Dynamic Variables"**

#### Variable 1: `transcript_analysis`
```
Name: transcript_analysis
Type: String
Description: Cockpit transcript and safety analysis
Default/Placeholder: "Test transcript analysis"
```

#### Variable 2: `first_prompt`
```
Name: first_prompt  
Type: String
Description: First message agent should say to pilots
Default/Placeholder: "Alert: Test emergency message"
```

**⚠️ WAŻNE:** Nazwy zmiennych muszą być dokładnie takie jak w kodzie (małe litery, z podkreślnikiem)

---

### Krok 3: Skonfiguruj System Prompt

W sekcji **"System Prompt"** dodaj na początku:

```
You are a Safety Officer providing urgent assistance to pilots in emergency situations.

SITUATION CONTEXT:
{{transcript_analysis}}

YOUR INITIAL MESSAGE TO PILOTS:
{{first_prompt}}

INSTRUCTIONS:
1. Start the conversation by immediately saying the message from "first_prompt" variable above
2. Then listen to the pilot's response
3. Provide clear, actionable guidance based on the situation described in transcript_analysis
4. Be professional, urgent but calm
5. Focus on safety-critical actions

Remember: Your first words should be exactly what's in the "first_prompt" variable.
```

---

### Krok 4: Skonfiguruj First Message (KLUCZOWE!)

W sekcji **"First Message"** (lub "Greeting") ustaw na:

```
{{first_prompt}}
```

**To jest KLUCZOWE!** Agent automatycznie wypowie zawartość zmiennej `first_prompt` jako pierwszą wiadomość.

---

### Krok 5: Zapisz i Przetestuj

1. Kliknij **"Save"** / **"Update Agent"**
2. Wróć do aplikacji i przetestuj flow:
   - Wywołaj sytuację emergency
   - Kliknij "Talk to Safety Officer"
   - Agent powinien **natychmiast** powiedzieć `first_prompt`

---

## 🔍 Weryfikacja

### W konsoli przeglądarki powinieneś zobaczyć:
```
🚀 [ConversationAgent] Starting conversation...
📋 [ConversationAgent] Transcript Analysis: COCKPIT TRANSCRIPT:...
📢 [ConversationAgent] First Prompt: Alert: Runway conflict detected...
🤖 [ConversationAgent] Agent ID: agent_4401kc79jma5e189ep8as6wm64mp
🔑 [ConversationAgent] Dynamic Variables: { transcript_analysis: "...", first_prompt: "..." }
📞 [ConversationAgent] Connecting to safety officer agent...
✅ [ConversationAgent] Connected to agent
ℹ️ [ConversationAgent] Context passed via dynamic variables
```

### Agent powinien:
1. ✅ Połączyć się (status: 🟢 Active)
2. ✅ **Automatycznie powiedzieć** `first_prompt` (np. "Alert: Runway conflict detected...")
3. ✅ Czekać na odpowiedź pilota
4. ✅ Kontynuować rozmowę bazując na `transcript_analysis`

---

## 🐛 Troubleshooting

### Problem: Agent nie mówi first_prompt automatycznie

**Przyczyna:** First Message w Dashboard nie jest ustawione na `{{first_prompt}}`

**Rozwiązanie:**
1. Sprawdź w ElevenLabs Dashboard → First Message
2. Upewnij się że jest tam DOKŁADNIE: `{{first_prompt}}`
3. Zapisz i odśwież stronę

---

### Problem: Agent mówi "Hello" zamiast first_prompt

**Przyczyna:** Default greeting nie zostało nadpisane przez dynamic variable

**Rozwiązanie:**
1. Usuń default greeting text
2. Zostaw tylko: `{{first_prompt}}`
3. Upewnij się że dynamic variable jest poprawnie nazwana (case-sensitive!)

---

### Problem: Agent mówi "first_prompt" literalnie

**Przyczyna:** Nawiasy klamrowe są źle sformatowane

**Rozwiązanie:**
Użyj dokładnie: `{{first_prompt}}` (dwie klamry otwierające, dwie zamykające)

---

## 📚 Przykład

### Dane z backendu:
```json
{
  "needsIntervention": true,
  "summary": "Two aircraft on runway 28. Coastal 115 is holding, another aircraft cleared to land.",
  "agentMessage": "Alert: Runway conflict detected. Aircraft cleared to land on runway 28 while you're holding. Immediate action required - hold position and await further instructions."
}
```

### Co dostanie agent:
```javascript
dynamicVariables: {
  transcript_analysis: "COCKPIT TRANSCRIPT:\nCoastal 115 line up and wait...\n\nSAFETY ANALYSIS:\nTwo aircraft on runway 28...",
  
  first_prompt: "Alert: Runway conflict detected. Aircraft cleared to land on runway 28 while you're holding. Immediate action required - hold position and await further instructions."
}
```

### Co powie agent (automatycznie po połączeniu):
```
"Alert: Runway conflict detected. Aircraft cleared to land on runway 28 
while you're holding. Immediate action required - hold position and 
await further instructions."
```

---

## ✅ Checklist Konfiguracji

- [ ] Dynamic variable `transcript_analysis` dodana
- [ ] Dynamic variable `first_prompt` dodana  
- [ ] System Prompt zawiera `{{transcript_analysis}}` i `{{first_prompt}}`
- [ ] **First Message ustawione na `{{first_prompt}}`** ⭐ KLUCZOWE!
- [ ] Agent zapisany
- [ ] Test: Agent automatycznie mówi first_prompt po połączeniu

---

## 📞 Test Manualny w Dashboard

Możesz przetestować bezpośrednio w ElevenLabs:

1. W Dashboard kliknij "Test" / "Preview"
2. Ustaw test dynamic variables:
   ```json
   {
     "transcript_analysis": "Test transcript: Runway conflict situation",
     "first_prompt": "Alert: This is a test emergency message"
   }
   ```
3. Rozpocznij test conversation
4. Agent powinien natychmiast powiedzieć: "Alert: This is a test emergency message"

---

**Autor:** AI Assistant  
**Data:** 2025-12-11  
**Wersja:** 1.0
