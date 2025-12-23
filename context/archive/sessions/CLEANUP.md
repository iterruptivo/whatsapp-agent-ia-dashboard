# CLEANUP - Archivos para Limpiar

> Instrucciones de limpieza post-migracion a metodologia PM.
> **REVISAR ANTES DE ELIMINAR** - algunos archivos pueden tener valor historico.

---

## ESTADO DE LA MIGRACION

**Fecha:** 23 Diciembre 2025
**Sesion:** 74

### Archivos Creados
- `context/INDEX.md` - Indice rapido
- `context/CURRENT_STATE.md` - Estado detallado
- `context/NEXT_STEPS.md` - Proximas acciones
- `context/SESSION_LOG.md` - Historial sesiones
- `context/DECISIONS.md` - Decisiones tomadas
- `context/BLOCKERS.md` - Bloqueadores
- `context/LESSONS_LEARNED.md` - Lecciones aprendidas
- `docs/requerimientos/REQUERIMIENTOS.md` - Requerimientos extraidos
- `.claude/agents/backend-dev.md` - Agente backend
- `.claude/agents/security-auth.md` - Agente seguridad
- `.claude/agents/qa-tester.md` - Agente QA
- `.claude/agents/docs-specialist.md` - Agente documentos

### Archivos Respaldados
- `context/archive/CLAUDE_BACKUP_20251223.md` - CLAUDE.md original (2100+ lineas)

---

## ARCHIVOS CANDIDATOS A ELIMINAR

### Categoria 1: Archivos temporales de analisis
> Estos son analisis especificos de sesiones pasadas, ya documentados en SESSION_LOG.

```
consultas-leo/ANALISIS_TOKEN_REFRESH_CHROME.md
consultas-leo/INCIDENT_REPORT_SESSION_35B.md
```
**Recomendacion:** MOVER a `context/archive/research/` por valor historico

### Categoria 2: Archivos de tareas activas (si estan completadas)
```
docs/active-tasks/CACHE_BUSTING_STRATEGY.md
```
**Recomendacion:** Si esta completada, MOVER a `docs/completed-tasks/`

### Categoria 3: Archivos QA de sesiones especificas
```
QA_TESTING_SESSION_58.md
QA_TESTING_SESSION_59.md
```
**Recomendacion:** MOVER a `context/archive/sessions/` o eliminar si ya no son relevantes

### Categoria 4: Prompts (CONSERVAR)
```
PROMPT - START PROJECT.md
```
**Recomendacion:** CONSERVAR - Es la metodologia PM para futuros proyectos

---

## DIRECTORIOS A REVISAR

### consultas-leo/
Contiene SQL historico, scripts de usuarios, y documentos de analisis.
**Recomendacion:** Mantener como referencia historica, pero organizar.

### docs/sesiones/
Contiene sesiones 2025-10-octubre.md, 2025-11-noviembre.md, 2025-12-diciembre.md
**Recomendacion:** CONSERVAR - Es el historial detallado del proyecto.

### docs/modulos/
Contiene documentacion por modulo (auth.md, leads.md, locales.md, etc.)
**Recomendacion:** CONSERVAR - Documentacion activa de modulos.

---

## ORDEN DE LIMPIEZA SUGERIDO

1. **Revisar** cada archivo antes de eliminar
2. **Mover** archivos con valor historico a `context/archive/`
3. **Eliminar** solo archivos que ya no tienen utilidad
4. **Actualizar** `context/INDEX.md` si hay cambios significativos

---

## COMANDOS DE LIMPIEZA (OPCIONALES)

```bash
# Mover analisis historicos
mv consultas-leo/ANALISIS_*.md context/archive/research/
mv consultas-leo/INCIDENT_*.md context/archive/research/

# Mover QA tests antiguos
mv QA_TESTING_SESSION_*.md context/archive/sessions/

# Verificar estructura final
ls -la context/
ls -la context/archive/
ls -la .claude/agents/
```

---

## NOTA IMPORTANTE

Este archivo (CLEANUP.md) tambien puede eliminarse una vez completada la limpieza.
Solo existe como guia para la reorganizacion del proyecto.

---

**Generado:** 23 Diciembre 2025
