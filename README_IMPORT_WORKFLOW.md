# Quick Start Guide: Import Fixed Workflow

## What Was Fixed

Your workflow broke when trying to add `horario_visita_timestamp`. I've created a FIXED version that:

1. ✅ **Adds horario_visita_timestamp feature** (what you wanted)
2. ✅ **Fixes duplicate message bug** (bonus fix from Session 7)
3. ✅ **Preserves ALL existing functionality** (notifications, database saves, etc.)

---

## Files Created

1. **V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (3-FIXED).json**
   - This is the workflow to import
   - Ready to use, fully functional

2. **IMPLEMENTATION_NOTES_horario_timestamp.md**
   - Detailed technical documentation
   - Read this if you want to understand what changed

3. **CLAUDE.md (updated)**
   - Session 8 documented
   - Full history preserved

---

## How to Import (Step-by-Step)

### 1. BACKUP First (CRITICAL!)
```
In n8n:
1. Go to your workflow
2. Click "..." menu (top right)
3. Click "Download"
4. Save as backup (just in case)
```

### 2. Import Fixed Workflow
```
In n8n:
1. Go to Workflows
2. Find "V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup)"
3. Click "..." → "Import from File"
4. Select: V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (3-FIXED).json
5. Confirm overwrite
6. Click "Save" (top right)
```

### 3. Verify Import
Check these nodes exist and are connected:
- ✅ Webhook: Recibir WhatsApp
- ✅ Message a model (Victoria's prompt)
- ✅ OpenAI - Extract Data
- ✅ **Parse Horario to Timestamp** (NEW NODE!)
- ✅ Code2
- ✅ Supabase - Upsert Lead

**Connection Order:**
```
OpenAI - Extract Data
    ↓
Parse Horario to Timestamp (NEW)
    ↓
Code2
```

### 4. Test It!
Send a WhatsApp message to your bot:
```
"Hola, soy Juan. Tengo una ferretería y quiero visitarlos mañana a las 3pm"
```

Expected behavior:
- Bot responds normally
- Check Supabase:
  - `nombre` = "Juan"
  - `rubro` = "ferretería"
  - `horario_visita` = "mañana a las 3pm"
  - `horario_visita_timestamp` = ISO timestamp (e.g., "2025-10-14T15:00:00.000Z")
  - `historial_conversacion` = NO duplicates

---

## What Changed (Summary)

### 1. OpenAI - Extract Data Node
- Now extracts: `horario_visita_fecha` (DD/MM/YYYY)
- Now extracts: `horario_visita_hora` (H:MMam/pm)
- Added temporal context (today's date, timezone)

### 2. NEW Node: Parse Horario to Timestamp
- Converts fecha + hora → ISO timestamp
- Returns `null` if data is incomplete
- Safe fallbacks (no errors thrown)

### 3. Code2 Node
- Reads timestamp from Parse node
- Passes it to Supabase
- **FIXED:** Removed duplicate "Usuario: " message

### 4. Supabase - Upsert Lead Node
- Now saves `horario_visita_timestamp` field

---

## Rollback (If Needed)

If something goes wrong:
```
1. Import your backup (the file you downloaded in step 1)
   OR
2. Import: V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (1).json
   (This is the last stable version)
```

---

## Database Requirement

Make sure this column exists in Supabase:
```sql
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS horario_visita_timestamp TIMESTAMPTZ NULL;
```

(You probably already created this when you tried to add the feature)

---

## Expected Behavior

### Scenario 1: User mentions specific time
```
User: "Quiero visitar mañana a las 3pm"

Saved to database:
- horario_visita: "mañana a las 3pm"
- horario_visita_timestamp: "2025-10-14T15:00:00.000Z"
```

### Scenario 2: User doesn't mention time
```
User: "Hola, soy Pedro, tengo un bazar"

Saved to database:
- horario_visita: "" (empty)
- horario_visita_timestamp: NULL
```

### Scenario 3: User mentions date but not time
```
User: "Quiero visitar mañana"
Bot: "¿A qué hora te gustaría visitarnos?"

Saved to database:
- horario_visita: "mañana"
- horario_visita_timestamp: NULL (no time specified)
```

---

## Troubleshooting

### Problem: "Parse Horario to Timestamp" node not found
**Solution:** Re-import the workflow. Make sure you selected the (3-FIXED) file.

### Problem: Data not saving to database
**Solution:**
1. Check n8n execution logs (click on workflow execution)
2. Find which node failed
3. Check error message
4. Verify Supabase column exists

### Problem: Notifications not sent
**Solution:**
1. This was likely broken in your manual attempt
2. The fixed workflow preserves the notification flow
3. Check "IF - Conversacion Cerrada?" node
4. Check "Supabase - Get Vendedores" node

### Problem: Messages still duplicated
**Solution:**
1. Check that Code2 node has the fix
2. Look for: historialPrevio + "AgenteIA: " + mensajeBot
3. Should NOT have: "Usuario: " + userMessage
4. Re-import if necessary

---

## Success Indicators

You'll know it's working when:
- ✅ Bot responds to WhatsApp messages
- ✅ Data saves to Supabase
- ✅ `horario_visita_timestamp` populates when user mentions time
- ✅ `historial_conversacion` has no duplicate messages
- ✅ Notifications sent to vendedores when lead completes

---

## Questions?

1. Read `IMPLEMENTATION_NOTES_horario_timestamp.md` for technical details
2. Read `CLAUDE.md` Session 8 for full context
3. Check n8n execution logs for errors

---

**Last Updated:** 2025-10-13
**Version:** 3-FIXED
**Status:** Ready to import and test
