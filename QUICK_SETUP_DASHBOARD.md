# ⚡ SZYBKA KONFIGURACJA - ElevenLabs Dashboard

## 🚨 KROK PO KROKU (5 minut)

### 1. Otwórz Dashboard
https://elevenlabs.io/app/conversational-ai

### 2. Znajdź agenta
ID: `agent_4401kc79jma5e189ep8as6wm64mp`

---

## 📋 KONFIGURACJA:

### ✅ Krok 1: Dynamic Variables

**Settings → Personalization → Dynamic Variables**

Dodaj 2 zmienne:

#### Variable 1:
```
Name: transcript_analysis
Type: String
Description: Cockpit transcript and safety analysis
Default value: Test transcript
```

#### Variable 2:
```
Name: first_prompt
Type: String  
Description: First message agent should say
Default value: Alert: Test message
```

**Kliknij SAVE!**

---

### ✅ Krok 2: First Message

**Settings → First Message (lub Greeting)**

Usuń całą zawartość i wpisz TYLKO:

```
{{first_prompt}}
```

**WAŻNE:** Muszą być dokładnie dwie klamry otwierające i dwie zamykające!

**Kliknij SAVE!**

---

### ✅ Krok 3: System Prompt

**Settings → System Prompt**

Dodaj NA POCZĄTKU prompta:

```
You are a Safety Officer providing urgent assistance to pilots.

SITUATION CONTEXT:
{{transcript_analysis}}

IMPORTANT: Your first words must be the message in the first_prompt variable.
After that, provide clear guidance based on the situation.
```

**Kliknij SAVE!**

---

## 🧪 TEST:

1. W Dashboard kliknij **"Test" lub "Preview"**
2. W test variables dodaj:
   ```json
   {
     "transcript_analysis": "Test situation",
     "first_prompt": "Alert: This is a test"
   }
   ```
3. Rozpocznij test
4. Agent powinien powiedzieć: **"Alert: This is a test"**

✅ Jeśli działa → GOTOWE!  
❌ Jeśli nie działa → Sprawdź czy zmienne są dokładnie takie jak wyżej

---

## 🚀 TERAZ TESTUJ W APLIKACJI:

1. Odśwież stronę aplikacji (F5)
2. Kliknij mikrofon
3. Powiedz scenariusz konflikt na pasie
4. Kliknij "Talk to Safety Officer"
5. Agent powinien automatycznie powiedzieć alert!

---

## ❓ Troubleshooting:

### Agent nie mówi:
- Sprawdź First Message = `{{first_prompt}}` (z klamrami!)
- Sprawdź czy dynamic variables istnieją
- Zapisz wszystkie zmiany

### Agent mówi "Hello":
- First Message nie jest ustawione poprawnie
- Usuń default greeting

### Błąd połączenia:
- Sprawdź mikrofon permissions
- Sprawdź czy backend działa (localhost:8000)

---

**To wszystko! Powinno zadziałać w 5 minut.** 🎉
