# Análisis de Confirmaciones de Asistencia - Repulse Trujillo

## Resumen

Sistema automatizado para analizar los historiales de conversación de los leads de la campaña Repulse Trujillo y detectar quiénes confirmaron que asistieron al proyecto.

## Contexto

- **Proyecto:** Mercado Trujillo
- **Campaña:** Repulse (re-engagement de leads sin compra)
- **Total de leads en campaña:** 580
- **Leads que confirmaron asistencia:** 21 (3.6%)

## Scripts Disponibles

### 1. `analizar-confirmaciones-asistencia.js`

**Propósito:** Analiza todos los historiales de conversación y detecta confirmaciones de asistencia.

**Ejecución:**
```bash
node scripts/analizar-confirmaciones-asistencia.js
```

**Output:**
- CSV completo con todos los leads: `confirmaciones_asistencia_YYYY-MM-DDTHH-MM-SS.csv`
- Resumen en consola con estadísticas

**Patrones detectados:**
- Confirmaciones directas: "sí asistí", "ya fui", "si visité", "si fui", etc.
- Afirmaciones contextuales: "si" o "sí" después de pregunta sobre visita
- Variaciones sin tildes y con mayúsculas

### 2. `generar-reporte-confirmaciones.js`

**Propósito:** Genera un reporte ejecutivo legible con solo los leads que confirmaron.

**Ejecución:**
```bash
node scripts/generar-reporte-confirmaciones.js
```

**Output:**
- Reporte de texto: `RESUMEN_confirmaciones_YYYY-MM-DDTHH-MM-SS.txt`
- CSV filtrado: `CONFIRMADOS_YYYY-MM-DDTHH-MM-SS.csv`

### 3. `actualizar-campo-asistio.js`

**Propósito:** Actualiza masivamente el campo `asistio` en la base de datos para los leads confirmados.

**Ejecución:**
```bash
# Modo dry-run (sin cambios reales)
node scripts/actualizar-campo-asistio.js --dry-run

# Ejecución real (actualiza la BD)
node scripts/actualizar-campo-asistio.js
```

**Precauciones:**
- Espera 5 segundos antes de ejecutar (tiempo para cancelar con Ctrl+C)
- Actualiza el campo `asistio = TRUE` en la tabla `leads`
- Muestra progreso en tiempo real

### 4. `ver-muestra-historiales.js`

**Propósito:** Herramienta de debugging para ver ejemplos de historiales y su estructura.

**Ejecución:**
```bash
node scripts/ver-muestra-historiales.js
```

## Resultados del Análisis

### Estadísticas

| Métrica | Valor |
|---------|-------|
| Total de leads analizados | 580 |
| Leads con historial | 580 (100%) |
| Leads que confirmaron asistencia | 21 (3.6%) |
| Confirmaciones directas | 15 (71.4%) |
| Afirmaciones contextuales | 6 (28.6%) |

### Tipos de Confirmación

1. **Confirmación directa (71.4%)**
   - "Si asistí"
   - "Ya fui"
   - "Si visite"
   - "Si fui y separé mi puesto también con un anticipo"

2. **Afirmación contextual (28.6%)**
   - Bot: "¿Confirmarnos si asistió o no?"
   - Usuario: "Si"

### Ejemplos Destacados

1. **Rocío Haydee Vasquez Ruiz** (51961688044)
   - Confirmó: "Si fui y separé mi puesto también con un anticipo"
   - **LEAD CALIENTE**: Ya tiene separación con anticipo

2. **Cecilia González y Segundo Antonio Romero Lopez** (51949695685)
   - Confirmó: "Si asistió mi tio Segundo"
   - Grupo familiar interesado

3. **Alondra Zavaleta Castro y Teresa Castro Guzmán y Manuel Zavaleta Zavaleta** (51969176747)
   - Confirmó: "Buenas noches, si fuimos"
   - Grupo familiar que visitó junto

## Recomendaciones

### 1. Seguimiento Inmediato

Los 21 leads confirmados deben recibir contacto prioritario:

- ✅ Ya visitaron el proyecto físicamente
- ✅ Respondieron al mensaje de Repulse (interés activo)
- ✅ Son candidatos calientes para cierre

**Acción sugerida:** Asignar a vendedores top para seguimiento en 24-48 horas.

### 2. Caso Especial: Rocío Vasquez

Lead con separación confirmada pero que apareció en Repulse. Investigar:
- ¿El sistema no detectó su compra?
- ¿Está en `locales_leads`?
- ¿Por qué entró en la campaña de Repulse?

### 3. Análisis del 96.4% sin Confirmación

Investigar por qué la mayoría no confirmó:
- ¿Vieron el mensaje pero no visitaron?
- ¿No vieron el mensaje de Repulse?
- ¿Perdieron interés después de la visita inicial?

**Acción sugerida:** Enviar segundo mensaje de Repulse más directo.

### 4. Actualización de Base de Datos

Ejecutar el script de actualización para marcar correctamente el campo `asistio`:

```bash
# Primero revisar en dry-run
node scripts/actualizar-campo-asistio.js --dry-run

# Si todo está OK, ejecutar
node scripts/actualizar-campo-asistio.js
```

### 5. Segmentación de Campaña

Crear tres segmentos:

1. **Confirmaron asistencia (21)** → Campaña de cierre agresiva
2. **Respondieron pero no confirmaron (~50)** → Campaña de re-invitación
3. **No respondieron (~509)** → Campaña de recordatorio suave

## Formato del Historial

Los historiales están guardados como texto plano en este formato:

```
Usuario: [mensaje del lead]
AgenteIA: [mensaje del bot]

[REPULSE DD/MM/YYYY, HH:MM]: [mensaje de repulse]

--- REPULSE [DD/MM/YYYY, HH:MM] ---
[Mensaje enviado por sistema]
```

El parser identifica automáticamente:
- Mensajes del usuario (para análisis)
- Mensajes del bot/sistema (para contexto de pregunta)

## Archivos Generados

Ubicación: `docs/reportes/`

| Tipo | Nombre | Descripción |
|------|--------|-------------|
| CSV completo | `confirmaciones_asistencia_*.csv` | Todos los leads (585) |
| CSV filtrado | `CONFIRMADOS_*.csv` | Solo confirmados (21) |
| Reporte texto | `RESUMEN_confirmaciones_*.txt` | Reporte ejecutivo |

## Próximos Pasos

- [ ] Actualizar campo `asistio` en base de datos
- [ ] Asignar leads confirmados a vendedores
- [ ] Crear campaña de cierre para estos 21 leads
- [ ] Investigar caso de Rocío Vasquez (separación pero en Repulse)
- [ ] Diseñar segundo mensaje de Repulse para no respondieron
- [ ] Monitorear tasa de conversión de confirmados vs no confirmados

## Notas Técnicas

### Performance

- **Procesamiento por lotes:** 50 leads por consulta para evitar Headers Overflow
- **Tiempo de ejecución:** ~20 segundos para 580 leads
- **Memoria:** ~50MB

### Precisión del Análisis

- **Patrones:** 21 expresiones regulares diferentes
- **Contexto:** Analiza hasta 3 mensajes previos para afirmaciones simples
- **Falsos positivos:** Mínimos (revisión manual recomendada)
- **Falsos negativos:** Posibles si usan lenguaje muy indirecto

### Mejoras Futuras

1. Integrar con IA (GPT-4) para análisis semántico más profundo
2. Detectar también rechazos explícitos ("no fui", "no pude ir")
3. Extraer motivo de no asistencia cuando se menciona
4. Clasificar nivel de interés basado en tono de respuesta

## Contacto

Script desarrollado por Claude Code (Python Data Science Engineer)
Fecha: 12 de enero de 2026

---

**Última actualización:** 12/01/2026, 06:40 AM
