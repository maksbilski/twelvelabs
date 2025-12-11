# 🔧 NAPRAW: Agent się łączy ale nie mówi

## ❌ PROBLEM:
```
✅ Connected to agent  ← Połączony
⏳ Waiting for agent to speak...
❓ 3 seconds passed - Did agent speak?  ← NIE MÓWI!
```

## ✅ ROZWIĄZANIE: First Message w Dashboard

### KROK 1: Otwórz agenta w Dashboard

https://elevenlabs.io/app/conversational-ai

Agent ID: `agent_4401kc79jma5e189ep8as6wm64mp`

---

### KROK 2: Znajdź "First Message" / "Greeting"

To może być w jednym z tych miejsc:
- **Agent Settings** → **First Message**
- **Agent Settings** → **Greeting**
- **Conversation Flow** → **Initial Message**
- **Prompt** → **First Message**

---

### KROK 3: Sprawdź co tam jest

#### ❌ ŹLE - Jeśli widzisz coś takiego:
```
Hello! How can I help you today?
```
LUB
```
Hi there! I'm here to assist you.
```
LUB
```
{{user_name}}, how can I help?
```
LUB puste pole

**To jest PROBLEM** - agent mówi default greeting zamiast first_prompt!

---

#### ✅ DOBRZE - Powinno być DOKŁADNIE:
```
{{first_prompt}}
```

**WAŻNE:**
- Dokładnie `{{first_prompt}}` - małe litery
- Dwie klamry otwierające: `{{`
- Dwie klamry zamykające: `}}`
- Bez spacji: NIE `{{ first_prompt }}`
- Bez cudzysłowów: NIE `"{{first_prompt}}"`
- Nic więcej - TYLKO te 17 znaków!

---

### KROK 4: Usuń wszystko i wpisz

1. **Zaznacz cały tekst** w polu First Message (Ctrl+A)
2. **Usuń** (Delete/Backspace)
3. **Wpisz ręcznie:** `{{first_prompt}}`
4. **Kliknij SAVE** (bardzo ważne!)
5. **Poczekaj aż zapisze** (może być spinner/loading)

---

### KROK 5: Sprawdź Dynamic Variables

W tym samym Dashboard:
- **Settings** → **Dynamic Variables** lub **Personalization**

Sprawdź czy istnieją:

#### Variable 1: `first_prompt`
```
Name: first_prompt
Type: String
```

#### Variable 2: `transcript_analysis`  
```
Name: transcript_analysis
Type: String
```

**Jeśli NIE MA** - dodaj je! (kliknij + Add variable)

---

### KROK 6: TEST w Dashboard

1. W Dashboard kliknij **"Test"** / **"Preview"**
2. Obok "Test Variables" kliknij **"Configure"** / **"+"**
3. Dodaj test values:
   ```json
   {
     "first_prompt": "Alert: This is a test message from dynamic variable",
     "transcript_analysis": "Test context"
   }
   ```
4. **Kliknij Start / Test**
5. Agent powinien **natychmiast** powiedzieć:
   ```
   "Alert: This is a test message from dynamic variable"
   ```

✅ **Jeśli agent mówi test message** → DZIAŁA! Idź do kroku 7  
❌ **Jeśli agent mówi "Hello" lub nic** → Wróć do kroku 3, sprawdź First Message

---

### KROK 7: Test w aplikacji

1. **Odśwież aplikację** (F5)
2. **Kliknij mikrofon** i powiedz scenariusz
3. **Kliknij panic button** → "Talk to Safety Officer"
4. **W konsoli zobaczysz:**
   ```
   ✅ Connected to agent
   ⏳ Waiting for agent to speak...
   🔄 Mode changed to: speaking  ← TO JEST KLUCZOWE!
   🗣️ AGENT IS SPEAKING!
   💬 Message received: ...
   ```

✅ **Jeśli widzisz "AGENT IS SPEAKING"** → DZIAŁA!  
❌ **Jeśli NIE MA "speaking" mode** → Agent nie zaczyna, wróć do kroku 3

---

## 🐛 Jeśli NADAL nie działa:

### Sprawdź czy przypadkiem:

1. **Agent ma więcej niż jeden prompt/greeting**
   - Usuń wszystkie inne First Messages
   - Zostaw tylko `{{first_prompt}}`

2. **Agent ma "Conversation Starters" / "Suggested Prompts"**
   - Te mogą override First Message
   - Wyłącz je lub usuń

3. **Agent ma "Auto-start" wyłączone**
   - W Settings włącz "Auto-start conversation"
   - Lub "Start speaking immediately"

4. **Language mismatch**
   - Sprawdź czy agent ma ustawiony język: English
   - first_prompt jest po angielsku

---

## 📸 Zrzuty ekranu (jeśli potrzebujesz):

### Przykład DOBRZE skonfigurowanego First Message:
```
┌─────────────────────────────────────┐
│ First Message / Greeting            │
├─────────────────────────────────────┤
│ {{first_prompt}}                    │ ← DOKŁADNIE TO
└─────────────────────────────────────┘
       [SAVE]  ← Kliknij!
```

### Przykład ŹLE skonfigurowanego:
```
┌─────────────────────────────────────┐
│ First Message / Greeting            │
├─────────────────────────────────────┤
│ Hello! How can I help you today?    │ ← TO JEST PROBLEM!
└─────────────────────────────────────┘
```

---

## 🆘 Ostateczna opcja:

Jeśli nic nie działa, wyślij mi screenshot swojej konfiguracji:
1. Agent Settings → First Message
2. Agent Settings → Dynamic Variables
3. Console logs z aplikacji (pierwsze 20 linii po kliknięciu panic button)

---

**Powinno zadziałać po poprawnej konfiguracji First Message!** 🚀
