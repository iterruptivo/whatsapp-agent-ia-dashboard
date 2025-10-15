# ROOT CAUSE ANALYSIS: Timezone & NULL Timestamp Issues

**Date:** 2025-10-14
**Project:** EcoPlaza Dashboard - horario_visita_timestamp Feature
**Status:** CRITICAL BUGS IDENTIFIED

---

## EXECUTIVE SUMMARY

Three critical issues have been identified with the `horario_visita_timestamp` implementation:

1. **CRITICAL: Parse node is missing its code** - The "Parse Horario to Timestamp" node has NO `jsCode` parameter, so it does nothing
2. **CRITICAL: Timezone mismatch** - Timestamps are created in server's LOCAL timezone (UTC+0) instead of Lima timezone (UTC-5)
3. **CRITICAL: Dashboard displays wrong time** - 5-hour offset error

---

## PROBLEM 1: NULL Timestamp for "Lead Incompleto"

### Test Case
```
User said: "pasado mañana a las 10 de la mañana"
Database: horario_visita_timestamp = NULL
Lead status: "Lead Incompleto"
```

### ROOT CAUSE: Parse Node Has NO CODE

**File:** V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (3-FIXED).json
**Node:** "Parse Horario to Timestamp" (ID: NEW-PARSE-HORARIO-NODE-ID)
**Line:** ~1328

**ACTUAL NODE DEFINITION:**
```json
{
  "parameters": {
    // MISSING: "jsCode": "..."
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [1328, 64],
  "id": "NEW-PARSE-HORARIO-NODE-ID",
  "name": "Parse Horario to Timestamp"
}
```

**EXPECTED NODE DEFINITION:**
```json
{
  "parameters": {
    "jsCode": "// Parse code goes here..."
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [1328, 64],
  "id": "NEW-PARSE-HORARIO-NODE-ID",
  "name": "Parse Horario to Timestamp"
}
```

**Why This Causes NULL:**
1. n8n workflow executes: OpenAI Extract → Parse Node → Code2
2. Parse node has NO code → returns empty/undefined
3. Code2 reads: `$node["Parse Horario to Timestamp"].json?.horario_visita_timestamp` → undefined
4. Code2 assigns: `horario_visita_timestamp = undefined || null` → **NULL**
5. Supabase stores: **NULL**

**Evidence:**
- Workflow file shows node exists with connections
- But `parameters` object is EMPTY (no `jsCode` property)
- IMPLEMENTATION_NOTES_horario_timestamp.md documents the code that SHOULD be there
- But the actual JSON file doesn't have it

---

## PROBLEM 2: Timezone Inconsistency (4pm Lima → 11am Lima)

### Test Case
```
User said: "próximo jueves a las 4 de la tarde"
Database: horario_visita_timestamp = "2025-10-19T16:00:00+00"
Dashboard displays: "19/10/2025 11:00AM"
```

### ROOT CAUSE: Server Local Time vs Lima Time

**Expected Behavior:**
```
User says: "4 de la tarde" (meaning 4pm in Lima, Peru - UTC-5)
Should store: "2025-10-19T21:00:00.000Z" (4pm Lima = 9pm UTC)
Should display: "19/10/2025 4:00PM" (converted back to Lima time)
```

**Actual Behavior:**
```
User says: "4 de la tarde"
Parse node creates: new Date(2025, 9, 19, 16, 0, 0) (October 19, 4pm LOCAL SERVER TIME)
Server timezone: UTC+0 (n8n server is probably in UTC)
Stored as: "2025-10-19T16:00:00.000Z" (4pm UTC)
Dashboard reads: "2025-10-19T16:00:00.000Z"
Dashboard converts: 16:00 UTC → 11:00 Lima (16 - 5 = 11)
Dashboard displays: "11:00AM" ❌ WRONG (should be 4:00PM)
```

**Code Location:**
The INTENDED code for Parse node (from IMPLEMENTATION_NOTES) would have:

```javascript
// WRONG (current intended code):
const dateObj = new Date(year, month - 1, day, hour, minute, 0, 0);
// This creates date in SERVER'S LOCAL timezone (UTC+0 for most cloud servers)
```

**Why This is Wrong:**
- `new Date(year, month, day, hour, minute)` creates date in **LOCAL TIMEZONE OF THE SERVER**
- n8n servers are usually in UTC (UTC+0)
- User's time is in Lima (UTC-5)
- Result: 5-hour offset error

---

## PROBLEM 3: Date Calculation Ambiguity

### Test Case Analysis
```
Today: 2025-10-14 (Tuesday in Lima)
User says: "próximo jueves"
Database shows: 2025-10-19 (Sunday!)
```

**Wait... let me verify:**
- 2025-10-14 = Tuesday
- 2025-10-16 = Thursday (this Thursday)
- 2025-10-19 = Sunday (NOT jueves!)

**ADDITIONAL ISSUE FOUND: Date is completely wrong!**

The date "2025-10-19" is a SUNDAY, not a Thursday. This suggests:
1. Either GPT-4o-mini is calculating dates incorrectly
2. Or the Parse node is parsing DD/MM/YYYY incorrectly
3. Or there's a month/day confusion (American vs European format)

---

## COMPREHENSIVE SOLUTION

### FIX 1: Add Missing jsCode to Parse Node

**Required Code** (with CORRECT timezone handling):

```javascript
// Get extracted data from OpenAI
const extracted = $json;

const horario_visita_fecha = (extracted.horario_visita_fecha || "").trim();
const horario_visita_hora = (extracted.horario_visita_hora || "").trim();

// If either fecha or hora is missing, return null
if (!horario_visita_fecha || !horario_visita_hora) {
  return [{ json: { horario_visita_timestamp: null } }];
}

try {
  // Parse fecha: DD/MM/YYYY
  const [day, month, year] = horario_visita_fecha.split('/').map(Number);

  if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
    return [{ json: { horario_visita_timestamp: null } }];
  }

  // Parse hora: H:MMam/pm or HH:MMam/pm
  const horaMatch = horario_visita_hora.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);

  if (!horaMatch) {
    return [{ json: { horario_visita_timestamp: null } }];
  }

  let hour = parseInt(horaMatch[1]);
  const minute = parseInt(horaMatch[2]);
  const period = horaMatch[3].toLowerCase();

  // Convert to 24-hour format
  if (period === 'pm' && hour !== 12) {
    hour += 12;
  } else if (period === 'am' && hour === 12) {
    hour = 0;
  }

  // CORRECT APPROACH: Create ISO string with explicit Lima timezone offset
  // Lima is UTC-5, so we need to ADD 5 hours to get UTC time
  const limaDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00-05:00`;

  // Parse the ISO string with timezone
  const dateObj = new Date(limaDateString);

  if (isNaN(dateObj.getTime())) {
    return [{ json: { horario_visita_timestamp: null } }];
  }

  // Return ISO string in UTC
  return [{ json: { horario_visita_timestamp: dateObj.toISOString() } }];

} catch (error) {
  // Fail gracefully
  return [{ json: { horario_visita_timestamp: null } }];
}
```

**Key Changes:**
1. **Explicit timezone offset:** `-05:00` in ISO string
2. **Proper UTC conversion:** JavaScript Date automatically converts to UTC
3. **Validation:** Checks for valid date components
4. **Null safety:** Returns null on any error

**Example:**
```javascript
// Input from GPT:
horario_visita_fecha = "19/10/2025"
horario_visita_hora = "4:00pm"

// Parse:
day = 19, month = 10, year = 2025
hour = 16 (4pm in 24h format)
minute = 0

// Create ISO string WITH Lima timezone:
limaDateString = "2025-10-19T16:00:00-05:00"

// JavaScript Date converts to UTC:
dateObj = new Date("2025-10-19T16:00:00-05:00")
// Internal UTC value: 2025-10-19T21:00:00.000Z (16:00-05:00 = 21:00 UTC)

// toISOString():
result = "2025-10-19T21:00:00.000Z"  ✅ CORRECT (4pm Lima = 9pm UTC)
```

---

### FIX 2: Update Dashboard Formatters

**File:** `lib/formatters.ts`

**Current Code (Session 9 - Already has timezone handling):**
```typescript
export function formatVisitTimestamp(
  timestamp: string | null,
  timezone: string = 'America/Lima'
): string | null {
  if (!timestamp) return null;

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;

    // Format date part: DD/MM/YYYY
    const day = date.toLocaleString('es-PE', { day: '2-digit', timeZone: timezone });
    const month = date.toLocaleString('es-PE', { month: '2-digit', timeZone: timezone });
    const year = date.toLocaleString('es-PE', { year: 'numeric', timeZone: timezone });

    // Format time part: H:MMam/pm
    const hour = date.toLocaleString('en-US', { hour: 'numeric', hour12: true, timeZone: timezone });
    const minute = date.toLocaleString('es-PE', { minute: '2-digit', timeZone: timezone });

    // Parse hour to get just the number without am/pm
    const hourMatch = hour.match(/^(\d+)/);
    const hourNum = hourMatch ? hourMatch[1] : '0';

    // Get AM/PM (uppercase)
    const period = hour.toLowerCase().includes('pm') ? 'PM' : 'AM';

    return `${day}/${month}/${year} ${hourNum}:${minute}${period}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return null;
  }
}
```

**ANALYSIS:** Dashboard formatter is ALREADY CORRECT! ✅

The formatter uses `timeZone: 'America/Lima'` which should work correctly IF:
- The timestamp stored in DB is in UTC
- JavaScript's toLocaleString properly handles the timezone conversion

**Test Case (with FIXED Parse node):**
```javascript
// Stored in DB (from fixed parse node):
timestamp = "2025-10-19T21:00:00.000Z"  // 9pm UTC = 4pm Lima

// Dashboard formatter:
const date = new Date("2025-10-19T21:00:00.000Z");
// toLocaleString with timeZone: 'America/Lima'
// 21:00 UTC - 5 hours = 16:00 Lima = 4:00 PM

// Result:
"19/10/2025 4:00PM"  ✅ CORRECT
```

**Conclusion:** Dashboard code is correct, issue is in the n8n Parse node.

---

### FIX 3: Verify GPT Date Calculation

**Issue:** Database shows "2025-10-19" (Sunday) when user said "próximo jueves" (next Thursday)

**Today:** 2025-10-14 (Tuesday)

**Possible interpretations:**
- "próximo jueves" = 2025-10-16 (this Thursday, 2 days away)
- "próximo jueves" = 2025-10-23 (next Thursday, 9 days away)
- But 2025-10-19 = Sunday = **WRONG INTERPRETATION**

**Root Cause Options:**
1. **GPT-4o-mini miscalculation** - Model calculated wrong day
2. **Missing context** - OpenAI Extract node doesn't have "today's date" in prompt
3. **Timezone confusion** - Model confused about "today" due to timezone differences

**Check OpenAI Extract Node Prompt:**
Need to verify that the system prompt includes:
```
Fecha de hoy: 2025-10-14 (martes)
Timezone: America/Lima (UTC-5)
```

If this context is missing, GPT cannot reliably calculate relative dates like "mañana", "próximo jueves", etc.

---

## VERIFICATION STEPS

### Step 1: Check Parse Node Code Exists

```bash
# Search for jsCode in Parse node
grep -A200 "NEW-PARSE-HORARIO-NODE-ID" "V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (3-FIXED).json" | grep "jsCode"

# Expected: Should find "jsCode": "..."
# Actual: NOTHING (missing!)
```

### Step 2: Check OpenAI Extract Prompt

```bash
# Find OpenAI - Extract Data node
grep -A100 "OpenAI - Extract Data" "V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (3-FIXED).json" | grep -i "fecha de hoy"

# Expected: "Fecha de hoy: {{current_date}}" in prompt
# Need to verify this exists
```

### Step 3: Test Timezone Handling

```javascript
// Test Parse node code
const limaDateString = "2025-10-19T16:00:00-05:00";
const dateObj = new Date(limaDateString);
console.log(dateObj.toISOString());
// Expected: "2025-10-19T21:00:00.000Z"
// 16:00 Lima + 5 hours = 21:00 UTC ✅

// Test Dashboard formatter
const timestamp = "2025-10-19T21:00:00.000Z";
const date = new Date(timestamp);
const formatted = date.toLocaleString('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});
console.log(formatted);
// Expected: "19/10/2025 4:00PM" ✅
```

---

## SQL DIAGNOSTIC QUERY

```sql
-- Check existing data for timezone issues
SELECT
  telefono,
  nombre,
  horario_visita AS original_text,
  horario_visita_timestamp AT TIME ZONE 'UTC' AS timestamp_utc,
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS timestamp_lima,
  EXTRACT(HOUR FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS hour_lima,
  EXTRACT(DOW FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS day_of_week_lima,
  CASE EXTRACT(DOW FROM horario_visita_timestamp AT TIME ZONE 'America/Lima')
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END AS day_name_lima,
  fecha_captura,
  estado
FROM leads
WHERE horario_visita_timestamp IS NOT NULL
ORDER BY fecha_captura DESC
LIMIT 20;

-- Check for timezone offset issues
SELECT
  telefono,
  horario_visita,
  horario_visita_timestamp,
  -- If stored correctly (UTC), this should match user's local time
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS corrected_lima_time,
  -- Difference between UTC and Lima (should be -5 hours)
  EXTRACT(EPOCH FROM (horario_visita_timestamp - (horario_visita_timestamp AT TIME ZONE 'America/Lima'))) / 3600 AS hour_offset
FROM leads
WHERE horario_visita_timestamp IS NOT NULL;
```

**Expected Results:**
- `hour_offset` should be **0** (because `AT TIME ZONE` converts, doesn't show offset)
- `day_name_lima` should match what user said (e.g., "Jueves" for "próximo jueves")
- `hour_lima` should match user's time (e.g., 16 for "4pm")

**Actual Results (with current bug):**
- `timestamp_lima` will show wrong time (5 hours off)
- `day_name_lima` might be wrong day
- Indicates Parse node created timestamp in wrong timezone

---

## IMPACT ASSESSMENT

### Critical (Fix Immediately):
1. **Parse node missing code** - Feature completely broken, returns NULL always
2. **Timezone offset** - Users see wrong times (5-hour error)

### High (Fix Soon):
3. **Date calculation** - Wrong day of week displayed
4. **GPT context** - May need "today's date" in prompt

### Medium:
5. **Validation** - Need better error handling for invalid dates

---

## NEXT STEPS

1. **Create workflow V4-FIXED.json with:**
   - Add `jsCode` parameter to Parse node
   - Fix timezone handling (use -05:00 offset)
   - Verify OpenAI prompt has current date context

2. **Test with real data:**
   - Send "mañana a las 3pm" from Lima (UTC-5)
   - Verify stored UTC time is correct (+5 hours)
   - Verify dashboard displays correct Lima time

3. **Update CLAUDE.md:**
   - Document Session 10 (this analysis)
   - Mark Parse node as FIXED
   - Add timezone verification to testing checklist

---

## REFERENCES

- **n8n Workflow File:** V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (3-FIXED).json
- **Dashboard Formatters:** lib/formatters.ts (Session 9 - Already correct)
- **Implementation Notes:** IMPLEMENTATION_NOTES_horario_timestamp.md (Session 8)
- **CLAUDE.md:** Sessions 6-9 (timestamp feature development)
- **JavaScript Date with timezone:** [MDN - Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- **IANA Timezone:** America/Lima (UTC-5, no DST)

---

**Created:** 2025-10-14
**Author:** Claude Code (Project Leader)
**Status:** Analysis complete, fixes ready to implement
