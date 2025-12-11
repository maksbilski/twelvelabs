# 🐛 Debug: Agent nie zaczyna mówić

## Problem
Agent się łączy (status: Active) ale **nie mówi automatycznie** `firstPrompt`.

## Możliwe przyczyny:

### 1. ❌ `overrides.agent.firstMessage` może nie być wspierane w SDK
**Rozwiązanie:** Użyć dynamic variables + konfiguracja Dashboard

### 2. ❌ Agent w Dashboard ma default First Message który blokuje override
**Rozwiązanie:** Wyczyścić First Message w Dashboard i ustawić na `{{first_prompt}}`

### 3. ❌ System prompt nie jest wystarczająco jasny
**Rozwiązanie:** Instrukcja "START by saying..." może nie działać

---

## ✅ ROZWIĄZANIE: Wróć do dynamic variables + Dashboard config

### Krok 1: Sprawdź w ElevenLabs Dashboard

1. Otwórz: https://elevenlabs.io/app/conversational-ai
2. Znajdź agenta: `agent_4401kc79jma5e189ep8as6wm64mp`
3. Settings → **First Message**
4. **Usuń całą zawartość** lub ustaw na: `{{first_prompt}}`
5. Zapisz

### Krok 2: Sprawdź Dynamic Variables w Dashboard

1. Settings → Personalization → Dynamic Variables
2. Dodaj jeśli nie ma:
   - Variable: `first_prompt`
   - Type: String
   - Description: "First message agent should say"
3. Zapisz

---

## 🧪 Test w konsoli:

Sprawdź czy dynamic variables są przekazywane:

```javascript
// W konsoli przeglądarki po otwarciu modala:
console.log('Check these logs:');
console.log('🔑 [ConversationAgent] Dynamic Variables FULL');
console.log('📢 first_prompt:', 'Alert: ...');
```

Jeśli widzisz te logi, dynamic variables są przekazywane prawidłowo.

---

## 🔧 Quick Fix Test:

Testuj najpierw w Dashboard czy agent w ogóle używa First Message:

1. Dashboard → Test Agent
2. Ustaw First Message na: "Hello test"
3. Start test conversation
4. Czy agent mówi "Hello test"?
   - ✅ TAK → Dashboard działa, problem w dynamic variables
   - ❌ NIE → Problem z agentem lub ustawieniami

---

## 📋 Checklist:

- [ ] Dashboard: First Message = `{{first_prompt}}`
- [ ] Dashboard: Dynamic variable `first_prompt` istnieje
- [ ] Dashboard: System Prompt wspomina o first_prompt
- [ ] Kod: dynamicVariables zawiera `first_prompt`
- [ ] Test: Agent wypowiada "Hello test" w test mode
- [ ] Test: Agent wypowiada firstPrompt z kodu

---

## 🚨 Jeśli nadal nie działa:

### Alternatywa 1: Hardcode w Dashboard
Zamiast `{{first_prompt}}`, ustaw w Dashboard:
```
Alert: Emergency situation detected. Please respond immediately.
```

### Alternatywa 2: sendMessage po połączeniu
W kodzie, po onConnect:
```javascript
onConnect: () => {
  // Force agent to speak
  setTimeout(() => {
    conversationRef.current.sendTextInput(firstPrompt);
  }, 1000);
}
```

### Alternatywa 3: Użyj contextualUpdate
```javascript
onConnect: () => {
  conversationRef.current.sendContextualUpdate(
    `URGENT: Say this to pilots immediately: "${firstPrompt}"`
  );
}
```

---

**Status:** Investigating  
**Priorytet:** HIGH - agent musi mówić automatycznie
