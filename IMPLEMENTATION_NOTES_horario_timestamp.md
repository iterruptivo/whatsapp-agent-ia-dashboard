# Implementation Notes: horario_visita_timestamp Feature

## Summary
Fixed n8n workflow to safely add `horario_visita_timestamp` support without breaking existing functionality.

## Problem Analysis
The user manually tried to add timestamp parsing but the workflow broke:
- Data not saving to database
- Notifications not being sent
- Likely cause: Broken connections or invalid data flow

## Solution Approach
**MINIMAL, SAFE CHANGES** to preserve all existing functionality while adding timestamp feature.

---

## Changes Made

### 1. Updated "OpenAI - Extract Data" Node (ID: e40c59ce-1bf6-44e0-8b26-4815f1c92ced)

**What Changed:**
- Added `horario_visita_fecha` and `horario_visita_hora` to extraction prompt
- Updated system prompt to include date/time parsing instructions
- Added temporal context (today's date, timezone: America/Lima)
- Updated JSON output schema to include new fields

**Old Schema:**
```json
{
  "nombre": "",
  "rubro": "",
  "horario_visita": ""
}
```

**New Schema:**
```json
{
  "nombre": "",
  "rubro": "",
  "horario_visita": "",
  "horario_visita_fecha": "",
  "horario_visita_hora": ""
}
```

**Why This Works:**
- Backward compatible (new fields are optional)
- OpenAI will return empty strings if user doesn't mention time
- Doesn't break existing extraction logic

---

### 2. Added NEW Node: "Parse Horario to Timestamp" (AFTER OpenAI Extract Data)

**Node Details:**
- **Type:** Code node
- **ID:** NEW-PARSE-HORARIO-NODE-ID
- **Position:** [1328, 64] (between OpenAI Extract and Code2)
- **Function:** Parses `horario_visita_fecha` (DD/MM/YYYY) and `horario_visita_hora` (H:MMam/pm) into ISO timestamp

**Code Logic:**
```javascript
// 1. Get extracted data from OpenAI
// 2. Parse fecha: DD/MM/YYYY → [day, month, year]
// 3. Parse hora: H:MMam/pm → 24-hour format
// 4. Create ISO timestamp
// 5. Return { horario_visita_timestamp: timestamp | null }
```

**Safe Fallbacks:**
- If no fecha OR no hora → returns `null`
- If parsing fails → returns `null`
- Never throws errors

**Why This Works:**
- Isolated logic (doesn't affect other nodes)
- Single responsibility (only parses timestamp)
- Fail-safe (returns null on any error)

---

### 3. Updated "Code2" Node (ID: 9a322253-cbf0-4db4-92e3-8b1dce0609cf)

**Changes Made:**

1. **Read new fields from OpenAI Extract:**
```javascript
const horario_visita_fecha = (extracted.horario_visita_fecha || "").trim();
const horario_visita_hora = (extracted.horario_visita_hora || "").trim();
```

2. **Read parsed timestamp from new node:**
```javascript
const horario_visita_timestamp = $node["Parse Horario to Timestamp"].json?.horario_visita_timestamp || null;
```

3. **Pass timestamp to output:**
```javascript
return [{
  json: {
    // ... existing fields ...
    horario_visita_timestamp: horario_visita_timestamp,  // NEW
    // ... rest of fields ...
  }
}];
```

4. **CRITICAL FIX - Duplicate Message Bug:**
Removed duplicate "Usuario: " + userMessage line that was causing message duplication.

**Before (BROKEN):**
```javascript
const historial_conversacion =
  (historialPrevio ? historialPrevio + "\n" : "") +
  "Usuario: " + userMessage +  // ← DUPLICATE (already in historialPrevio)
  "\nAgenteIA: " + mensajeBot;
```

**After (FIXED):**
```javascript
const historial_conversacion =
  (historialPrevio ? historialPrevio + "\n" : "") +
  "AgenteIA: " + mensajeBot;  // ← Only add bot response
```

**Why This Fix is Critical:**
- Code1 already appends "Usuario: " + userMessage to historialPrevio
- Code2 receives historialPrevio from Code1
- If Code2 adds it again → DUPLICATION
- This was causing broken conversation history

---

### 4. Updated "Supabase - Upsert Lead" Node (ID: 777b467d-d3fb-4180-b320-b5df0f41ccec)

**What Changed:**
Added new body parameter to save timestamp:

```json
{
  "name": "horario_visita_timestamp",
  "value": "={{ $json.horario_visita_timestamp }}"
}
```

**Position in Body Parameters:**
Added AFTER `horario_visita` and BEFORE `estado` (line 4 of parameters)

**Why This Works:**
- Simple addition to existing upsert
- Database already has the column (user created it)
- Null values are allowed (no breaking changes)

---

### 5. Updated Connections

**New Connection Added:**
```
OpenAI - Extract Data → Parse Horario to Timestamp → Code2
```

**Old Flow:**
```
OpenAI - Extract Data → Code2
```

**New Flow:**
```
OpenAI - Extract Data → Parse Horario to Timestamp → Code2
```

**Why This Works:**
- Data flows through parse node
- Parse node adds timestamp to data stream
- Code2 receives all data (existing + timestamp)
- No other connections modified

---

## What Was NOT Changed (PRESERVED)

1. **"Message a model" node** - Victoria's conversational prompt UNTOUCHED
2. **All existing connections** - Except adding the new parse node
3. **Error handling** - All try-catch blocks maintained
4. **State logic** - Lead status logic unchanged
5. **Notification flow** - Vendor notification logic intact
6. **All node positions** - Only new node added at [1328, 64]
7. **All node IDs** - Preserved (except new node has NEW-PARSE-HORARIO-NODE-ID)

---

## Testing Checklist

### Before Importing
- [ ] Backup current workflow in n8n (Export before import)
- [ ] Verify Supabase has `horario_visita_timestamp` column (TIMESTAMPTZ NULL)

### After Importing
1. **Basic Flow Test:**
   - [ ] Send text message to WhatsApp bot
   - [ ] Verify bot responds
   - [ ] Check Supabase: record created/updated
   - [ ] Verify `historial_conversacion` is NOT duplicated

2. **Timestamp Feature Test:**
   - [ ] User message: "Quiero visitar mañana a las 3pm"
   - [ ] Check Supabase:
     - [ ] `horario_visita` = "mañana a las 3pm"
     - [ ] `horario_visita_timestamp` = correct ISO date
     - [ ] `horario_visita_fecha` NOT saved (only timestamp)
     - [ ] `horario_visita_hora` NOT saved (only timestamp)

3. **Notification Test:**
   - [ ] Complete a lead (nombre, rubro, horario)
   - [ ] Verify lead state changes to "lead_completo"
   - [ ] Check if notifications are sent to vendedores
   - [ ] Verify `estado_al_notificar` is captured

4. **No Timestamp Test:**
   - [ ] User doesn't mention horario
   - [ ] Verify `horario_visita_timestamp` = NULL
   - [ ] Verify conversation still works

---

## Rollback Instructions

If the workflow still doesn't work:

1. **In n8n UI:**
   - Go to Workflows
   - Find "V5B - Supabase - EcoPlaza..."
   - Click "..." menu → Import from File
   - Select `V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (1).json`
   - Confirm overwrite

2. **Verify stable version restored:**
   - Test basic message flow
   - Check data saving works
   - Verify notifications work

---

## Database Schema Required

```sql
-- Verify this column exists in Supabase
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS horario_visita_timestamp TIMESTAMPTZ NULL;
```

---

## Key Differences from User's Broken Version

1. **Fixed Code2 duplicate message bug** (user's version had this)
2. **Simpler parsing logic** (less complex than user's attempt)
3. **Proper null handling** (user's version may have had undefined issues)
4. **Preserved ALL connections** (user may have broken flow)
5. **No changes to Victoria's prompt** (user may have modified it)

---

## Expected Behavior

### Scenario 1: User mentions horario
```
User: "Quiero visitar mañana a las 3pm"
Bot: [Victoria's response]

Database saves:
- horario_visita: "mañana a las 3pm" (text)
- horario_visita_timestamp: "2025-10-14T15:00:00.000Z" (ISO)
```

### Scenario 2: User doesn't mention horario
```
User: "Hola, quiero información"
Bot: [Victoria's response]

Database saves:
- horario_visita: "" (empty)
- horario_visita_timestamp: NULL
```

### Scenario 3: Ambiguous horario
```
User: "Mañana"
Bot: [Victoria asks for time]

Database saves:
- horario_visita: "mañana" (text)
- horario_visita_timestamp: NULL (no time specified)
```

---

## Important Notes

1. **Message Duplication Fixed:** The broken version had a critical bug where Code2 was re-adding the user message to historial_conversacion. This is now fixed.

2. **Parse Node is Optional:** If OpenAI doesn't extract fecha/hora, the parse node returns null gracefully. No errors thrown.

3. **Backward Compatibility:** Old leads without timestamp continue to work. Dashboard can handle null timestamps.

4. **Dashboard Integration:** The dashboard already has the `horario_visita_timestamp` field in the `Lead` interface (from CLAUDE.md Session 6).

---

## Support

If issues persist:
1. Check n8n execution logs for the specific node that's failing
2. Verify Supabase column exists and accepts NULL
3. Test each node individually in n8n debugger
4. Compare connections in working vs broken version

---

**File Created:** 2025-10-13
**Author:** Claude Code (Project Leader)
**Status:** Ready for testing
