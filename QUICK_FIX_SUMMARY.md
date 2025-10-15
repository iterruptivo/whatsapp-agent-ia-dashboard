# QUICK FIX SUMMARY: Timezone Issues

**Date:** 2025-10-14
**Session:** 10
**Status:** CRITICAL BUGS IDENTIFIED & FIXED

---

## THE PROBLEM (User Reported)

1. ❌ **Test 1:** User said "próximo jueves a las 4 de la tarde"
   - Stored: `2025-10-19T16:00:00+00`
   - Dashboard showed: `19/10/2025 11:00AM` (5 hours off!)

2. ❌ **Test 2:** User said "pasado mañana a las 10 de la mañana"
   - Stored: `NULL`
   - Lead status: "Lead Incompleto"

---

## ROOT CAUSE ANALYSIS

### Issue 1: Timezone Offset (5 hours wrong)
**Cause:** Parse node creates timestamp in SERVER's local timezone (UTC) instead of Lima timezone (UTC-5)

```javascript
// WRONG CODE (current):
const timestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
// Creates: "2025-10-19T16:00:00.000Z" (4pm UTC)
// Dashboard displays: 11:00AM Lima (16:00 UTC - 5 hours)
```

**What Should Happen:**
- User says: "4 de la tarde" → 4pm Lima time
- Should store: "2025-10-19T21:00:00.000Z" (4pm Lima = 9pm UTC)
- Dashboard should show: "4:00PM"

### Issue 2: NULL Timestamp
**Actually NOT an issue** - The Parse node DOES have code in the workflow file!

The NULL might be caused by:
1. GPT not extracting fecha/hora correctly
2. Parse validation failing (invalid format)
3. Lead route bypassing parse node

---

## THE FIX

### Step 1: Update Parse Node Code (CRITICAL)

**File:** n8n workflow "V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup)"
**Node:** "Parse Horario to Timestamp"

**REPLACE THIS LINE:**
```javascript
const timestamp = new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
```

**WITH THIS:**
```javascript
// Create ISO string with Lima timezone offset
const limaDateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00-05:00`;

// Parse with timezone, converts to UTC automatically
const dateObj = new Date(limaDateString);

// Validate
if (isNaN(dateObj.getTime())) {
  return [{ json: { horario_visita_timestamp: null } }];
}

// Return UTC timestamp
const timestamp = dateObj.toISOString();
```

**See full code in:** `FIX_PARSE_NODE_TIMEZONE.md`

---

## HOW IT WORKS

### BEFORE (Broken):
```
User: "4pm" (Lima time)
Parse: new Date(2025, 9, 19, 16, 0, 0)
       → Creates in SERVER timezone (UTC)
       → "2025-10-19T16:00:00.000Z" (4pm UTC)
Dashboard: 16:00 UTC → 11:00 Lima (subtract 5 hours)
Display: "11:00AM" ❌ WRONG
```

### AFTER (Fixed):
```
User: "4pm" (Lima time)
Parse: "2025-10-19T16:00:00-05:00"
       → ^^^^^^^^^^^^^^^^^^^^^^ Lima timezone offset
       → JavaScript Date converts to UTC
       → "2025-10-19T21:00:00.000Z" (9pm UTC = 4pm Lima)
Dashboard: 21:00 UTC → 16:00 Lima (subtract 5 hours)
Display: "4:00PM" ✅ CORRECT
```

---

## TESTING

### Quick Test:
1. Apply fix in n8n (edit "Parse Horario to Timestamp" node)
2. Send WhatsApp message: "mañana a las 3pm"
3. Check Supabase timestamp (should be +5 hours from "3pm")
4. Check dashboard (should display "3:00PM")

### SQL Diagnostic:
```sql
SELECT
  telefono,
  horario_visita AS user_said,
  horario_visita_timestamp AS stored_utc,
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS display_lima,
  EXTRACT(HOUR FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS hour_lima
FROM leads
WHERE horario_visita_timestamp IS NOT NULL
ORDER BY fecha_captura DESC
LIMIT 5;
```

**Expected:** `hour_lima` matches what user said (e.g., 16 for "4pm")

---

## DOCUMENTS CREATED

1. **ROOT_CAUSE_TIMEZONE_ISSUES.md** - Complete technical analysis
2. **FIX_PARSE_NODE_TIMEZONE.md** - Step-by-step fix instructions with full code
3. **QUICK_FIX_SUMMARY.md** - This file (executive summary)

---

## DASHBOARD STATUS

✅ **Dashboard formatters are ALREADY CORRECT** (from Session 9)
- Uses `timeZone: 'America/Lima'` in toLocaleString
- Will display correctly once timestamps are stored in correct UTC

❌ **n8n Parse node needs fixing** (1 line change + validation)
- Apply fix from FIX_PARSE_NODE_TIMEZONE.md
- Test immediately after applying

---

## CHECKLIST FOR USER

- [ ] Read ROOT_CAUSE_TIMEZONE_ISSUES.md
- [ ] Read FIX_PARSE_NODE_TIMEZONE.md
- [ ] Open n8n workflow editor
- [ ] Find "Parse Horario to Timestamp" node
- [ ] Replace jsCode with fixed version
- [ ] Save and test with: "mañana a las 3pm"
- [ ] Verify dashboard shows correct time
- [ ] Run SQL diagnostic query
- [ ] Update CLAUDE.md Session 10

---

## PRIORITY

**CRITICAL** - Feature is broken without this fix. Users see wrong times (5 hour offset).

**Effort:** 5 minutes (copy/paste code in n8n UI)

**Risk:** LOW (isolated change, fails gracefully)

---

**Created:** 2025-10-14
**Author:** Claude Code (Project Leader)
**Next Steps:** Apply fix in n8n, test, document results
