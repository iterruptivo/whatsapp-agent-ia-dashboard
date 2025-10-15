# FIX: Parse Horario to Timestamp - Timezone Handling

**Date:** 2025-10-14
**File to modify:** V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (3-FIXED).json
**Node to fix:** "Parse Horario to Timestamp" (ID: NEW-PARSE-HORARIO-NODE-ID)

---

## PROBLEM IDENTIFIED

The Parse node exists and has code, BUT it uses the WRONG timezone handling approach.

**Current Code (WRONG - creates timestamp in SERVER's local timezone):**
```javascript
// Create ISO timestamp (timezone America/Lima = UTC-5)
try {
  const timestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
  return [{ json: { horario_visita_timestamp: timestamp } }];
} catch (e) {
  return [{ json: { horario_visita_timestamp: null } }];
}
```

**Why This is Wrong:**
- `new Date(year, month, day, hour, minute)` creates date in the **SERVER'S LOCAL TIMEZONE**
- Most n8n servers run in UTC (UTC+0)
- User's time is in Lima (UTC-5)
- Result: 5-hour offset when displayed in dashboard

**Example of the Bug:**
```javascript
// User says: "4 de la tarde" (4pm Lima time)
// GPT extracts: hora = "4:00pm", fecha = "19/10/2025"
// Parse node executes:

const year = 2025, month = 10, day = 19, hours = 16, minutes = 0;
const timestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
// Server is in UTC, so this creates: "2025-10-19T16:00:00.000Z"
// This means 4pm UTC, NOT 4pm Lima

// Dashboard reads: "2025-10-19T16:00:00.000Z"
// Converts to Lima: 16:00 UTC - 5 hours = 11:00 Lima
// Displays: "11:00AM" ❌ WRONG (should be 4:00PM)
```

---

## SOLUTION: Use Explicit Timezone Offset

**Replace the ENTIRE `jsCode` parameter in the "Parse Horario to Timestamp" node with this:**

```javascript
// Get extracted data from OpenAI
const extractedRaw = $json?.message?.content;
let extracted = { horario_visita_fecha: "", horario_visita_hora: "" };

try {
  if (typeof extractedRaw === "string") {
    extracted = JSON.parse(extractedRaw);
  } else if (typeof extractedRaw === "object" && extractedRaw) {
    extracted = extractedRaw;
  }
} catch (e) {
  // Si falla el parsing, devuelve null
  return [{ json: { horario_visita_timestamp: null } }];
}

const fecha = (extracted.horario_visita_fecha || "").trim();
const hora = (extracted.horario_visita_hora || "").trim();

// Si no hay fecha O no hay hora, timestamp es null
if (!fecha || !hora) {
  return [{ json: { horario_visita_timestamp: null } }];
}

// Parse fecha DD/MM/YYYY
const parts = fecha.split('/');
if (parts.length !== 3) {
  return [{ json: { horario_visita_timestamp: null } }];
}

const day = parseInt(parts[0], 10);
const month = parseInt(parts[1], 10);
const year = parseInt(parts[2], 10);

// Validate date components
if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
  return [{ json: { horario_visita_timestamp: null } }];
}

// Parse hora H:MMam/pm or HH:MMam/pm
const horaMatch = hora.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
if (!horaMatch) {
  return [{ json: { horario_visita_timestamp: null } }];
}

let hours = parseInt(horaMatch[1], 10);
const minutes = parseInt(horaMatch[2], 10);
const ampm = horaMatch[3].toLowerCase();

// Convert to 24-hour format
if (ampm === 'pm' && hours !== 12) {
  hours += 12;
} else if (ampm === 'am' && hours === 12) {
  hours = 0;
}

// CORRECT APPROACH: Create ISO string with explicit Lima timezone offset (-05:00)
// This tells JavaScript Date that the time is in Lima timezone
try {
  const limaDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00-05:00`;

  // Parse the ISO string with timezone
  const dateObj = new Date(limaDateString);

  // Validate the date
  if (isNaN(dateObj.getTime())) {
    return [{ json: { horario_visita_timestamp: null } }];
  }

  // Return ISO string in UTC (JavaScript automatically converts from Lima to UTC)
  return [{ json: { horario_visita_timestamp: dateObj.toISOString() } }];

} catch (e) {
  return [{ json: { horario_visita_timestamp: null } }];
}
```

---

## KEY CHANGES

### 1. ISO String with Timezone Offset
```javascript
// OLD (WRONG):
const timestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();

// NEW (CORRECT):
const limaDateString = `${year}-${month}-${day}T${hours}:${minutes}:00-05:00`;
const dateObj = new Date(limaDateString);
const timestamp = dateObj.toISOString();
```

### 2. How It Works

**Example: User says "4 de la tarde" on October 19, 2025**

```javascript
// Input:
fecha = "19/10/2025"
hora = "4:00pm"

// Parse:
day = 19, month = 10, year = 2025
hours = 16 (4pm in 24h), minutes = 0

// Create ISO string WITH timezone offset:
limaDateString = "2025-10-19T16:00:00-05:00"
//                                      ^^^^^ This tells JS that time is in UTC-5

// JavaScript Date parses this and converts to UTC:
dateObj = new Date("2025-10-19T16:00:00-05:00")
// Internal UTC time: 2025-10-19T21:00:00.000Z (16:00 Lima + 5 hours = 21:00 UTC)

// toISOString() returns UTC:
timestamp = "2025-10-19T21:00:00.000Z"
```

**Stored in Supabase:**
```
horario_visita_timestamp = "2025-10-19T21:00:00.000Z"
```

**Dashboard displays:**
```javascript
// Read from DB: "2025-10-19T21:00:00.000Z"
const date = new Date("2025-10-19T21:00:00.000Z");

// formatVisitTimestamp uses timeZone: 'America/Lima'
// toLocaleString converts: 21:00 UTC → 16:00 Lima (21 - 5 = 16)

// Display: "19/10/2025 4:00PM" ✅ CORRECT
```

---

## HOW TO APPLY THIS FIX

### Option 1: Manual Edit in n8n UI (RECOMMENDED)

1. **Open n8n workflow editor**
2. **Find "Parse Horario to Timestamp" node**
3. **Click to edit the node**
4. **Replace the entire code** with the new code above
5. **Save the node**
6. **Save the workflow**
7. **Test with a new message**

### Option 2: Import Fixed JSON (Advanced)

1. **Export current workflow** (backup!)
2. **Open exported JSON in text editor**
3. **Search for:** `"name": "Parse Horario to Timestamp"`
4. **Find the `jsCode` parameter** (inside `parameters` object)
5. **Replace the entire value** with the new code
6. **Save the JSON file**
7. **Import back to n8n**

---

## VALIDATION

### Test Case 1: "4 de la tarde"
```
Input:
- User says: "Quiero visitar próximo jueves a las 4 de la tarde"
- GPT extracts: fecha="19/10/2025", hora="4:00pm"

Expected Result:
- Stored timestamp: "2025-10-19T21:00:00.000Z" (9pm UTC = 4pm Lima)
- Dashboard displays: "19/10/2025 4:00PM" ✅

Current Bug:
- Stored timestamp: "2025-10-19T16:00:00.000Z" (4pm UTC)
- Dashboard displays: "19/10/2025 11:00AM" ❌ (5 hours off)
```

### Test Case 2: "10 de la mañana"
```
Input:
- User says: "Pasado mañana a las 10 de la mañana"
- GPT extracts: fecha="16/10/2025", hora="10:00am"

Expected Result:
- Stored timestamp: "2025-10-16T15:00:00.000Z" (3pm UTC = 10am Lima)
- Dashboard displays: "16/10/2025 10:00AM" ✅

With Fix:
- limaDateString = "2025-10-16T10:00:00-05:00"
- new Date() converts: 10:00 Lima + 5 hours = 15:00 UTC
- Stored: "2025-10-16T15:00:00.000Z" ✅
```

---

## SQL VERIFICATION QUERY

After applying the fix, run this query in Supabase SQL Editor:

```sql
-- Check if timestamps are correctly stored in UTC
SELECT
  telefono,
  horario_visita AS user_said,
  horario_visita_timestamp AS stored_utc,
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS display_lima,
  EXTRACT(HOUR FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS hour_lima,
  fecha_captura
FROM leads
WHERE horario_visita_timestamp IS NOT NULL
ORDER BY fecha_captura DESC
LIMIT 10;
```

**Expected Results:**
- `hour_lima` should match what user said (e.g., 16 for "4pm")
- `display_lima` should show correct local time
- `stored_utc` should be 5 hours ahead of `display_lima`

---

## TESTING CHECKLIST

### Before Fix:
- [ ] Send test message: "mañana a las 3pm"
- [ ] Check DB timestamp
- [ ] Check dashboard display
- [ ] Document the 5-hour error

### Apply Fix:
- [ ] Edit node in n8n
- [ ] Replace `jsCode` with new code
- [ ] Save node and workflow

### After Fix:
- [ ] Send same test: "mañana a las 3pm"
- [ ] Verify DB timestamp is 5 hours ahead (correct UTC conversion)
- [ ] Verify dashboard displays correct local time (3pm)
- [ ] Test with different times:
  - [ ] Morning: "10am" → should display "10:00AM"
  - [ ] Afternoon: "4pm" → should display "4:00PM"
  - [ ] Midnight: "12am" → should display "12:00AM"
  - [ ] Noon: "12pm" → should display "12:00PM"

---

## ADDITIONAL FIXES NEEDED

### Check OpenAI Extract Data Prompt

The OpenAI node should have today's date in its prompt so GPT can calculate relative dates correctly.

**Search for this in the workflow:**
```
"OpenAI - Extract Data"
```

**Verify the system prompt includes:**
```
Fecha de hoy: {{current_date}} (día de la semana)
Timezone: America/Lima (UTC-5)
```

If missing, GPT won't be able to correctly parse "mañana", "próximo jueves", etc.

---

## REFERENCES

- **JavaScript Date with timezone:** [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- **ISO 8601 Format:** `YYYY-MM-DDTHH:MM:SS±HH:MM`
- **Lima Timezone:** America/Lima (UTC-5, no daylight saving)
- **Dashboard Formatter:** lib/formatters.ts (already correct, uses timeZone: 'America/Lima')

---

## SUMMARY

**Root Cause:** Parse node uses `new Date(y, m, d, h, m)` which creates timestamp in SERVER's timezone (UTC), not user's timezone (Lima UTC-5).

**Solution:** Use ISO string with explicit timezone offset: `"2025-10-19T16:00:00-05:00"`, which JavaScript Date automatically converts to UTC correctly.

**Impact:** Fixes 5-hour offset error, ensures users see correct times in dashboard.

**Risk:** Low - change is isolated to Parse node, fails gracefully if error.

---

**Created:** 2025-10-14
**Author:** Claude Code (Project Leader)
**Status:** Ready to apply
**Priority:** CRITICAL (feature is broken without this fix)
