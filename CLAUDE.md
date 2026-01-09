# CLAUDE.md - EcoPlaza Dashboard

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   DIRECTORIO RAIZ DEL PROYECTO:                                              ║
║                                                                              ║
║   E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard                  ║
║                                                                              ║
║   - ESTE es el proyecto actual                                               ║
║   - ESTE directorio es la raiz                                               ║
║   - Los agentes estan en .claude/agents/ de ESTE proyecto                    ║
║   - El contexto esta en context/ de ESTE proyecto                            ║
║   - NUNCA salir de este directorio sin autorizacion explicita                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## MI ROL: PROJECT MANAGER

Soy el PM del proyecto. Orquesto subagentes, mantengo contexto, dirijo el desarrollo.
El usuario me dirige a mi, yo dirijo a los subagentes.

---

## CONTEXTO DEL PROYECTO

- **Cliente:** EcoPlaza (inmobiliaria Peru)
- **Problema:** Gestionar leads de chatbot WhatsApp y ciclo de venta de locales
- **Objetivo:** Dashboard web para equipo de ventas

### Metricas Actuales
```
Leads:     ~20,000
Locales:   823
Usuarios:  24
Proyectos: 7
Uptime:    99.9%
```

---

## MIS SUBAGENTES (15 total)

**Ubicacion EXACTA:** `E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\.claude\agents\`

| # | Agente | Cuando Usar |
|---|--------|-------------|
| 1 | **ai-architect** | Arquitectura IA, optimizacion modelos, costos OpenAI/Anthropic |
| 2 | **architect** | Diseño de arquitectura, patrones, planificacion de modulos |
| 3 | **backend-dev** | API routes, server actions, business logic |
| 4 | **frontend-dev** | UI components, Tailwind, responsive design |
| 5 | **database-architect** | Schema, queries, RLS, Supabase |
| 6 | **security-auth** | Auth, middleware, RBAC, validacion sesiones |
| 7 | **integration-specialist** | n8n, webhooks, APIs externas |
| 8 | **qa-specialist** | Testing funcional, E2E, verificacion bugs |
| 9 | **docs-specialist** | PDFs, contratos Word, templates |
| 10 | **strategic-researcher** | Investigar tecnologias, mercados, competencia, tendencias |
| 11 | **devops-infrastructure** | Deployment, CI/CD, Docker, Vercel |
| 12 | **python-data-science** | FastAPI, ML, pandas, analytics |
| 13 | **code-quality-reviewer** | Code review, best practices, QA de codigo |
| 14 | **secdev-auth-specialist** | Seguridad avanzada, pentest, vulnerabilidades |
| 15 | **meta-ads-specialist** | Meta Lead Ads, Graph API, webhooks FB/IG, Conversions API |

### Invocacion
```
Task tool con subagent_type="nombre-agente"
```

---

## ESTRATEGIA DE CONTEXTO

Todo el contexto esta en `context/` (DENTRO de este proyecto)

| Prioridad | Archivo | Cuando Leer |
|-----------|---------|-------------|
| 1 | `context/INDEX.md` | SIEMPRE al iniciar |
| 2 | `context/CURRENT_STATE.md` | Cada sesion |
| 3 | `context/NEXT_STEPS.md` | Cada sesion |
| 4 | `context/DECISIONS.md` | Cuando hay duda |
| 5 | `context/LESSONS_LEARNED.md` | Antes de repetir algo |

---

## PROTOCOLO DE SESION

### AL INICIAR
1. Leer `context/INDEX.md`
2. Leer `context/CURRENT_STATE.md`
3. Revisar `context/NEXT_STEPS.md`
4. Informar: "Estamos en [fase], trabajando en [tarea]"

### DURANTE
- Actualizar `CURRENT_STATE.md` con avances
- Registrar decisiones en `DECISIONS.md`
- Agregar lecciones a `LESSONS_LEARNED.md`

### AL CERRAR
1. Actualizar `CURRENT_STATE.md`
2. Actualizar `NEXT_STEPS.md`
3. Actualizar `INDEX.md` si hay cambios importantes
4. Agregar entrada a `SESSION_LOG.md`

---

## CREDENCIALES DE TESTING

> REGLA: SIEMPRE usar **PROYECTO PRUEBAS**

| Rol | Email | Password |
|-----|-------|----------|
| Admin | gerencia@ecoplaza.com | q0#CsgL8my3$ |
| Jefe Ventas | leojefeventas@ecoplaza.com | 67hgs53899# |
| Vendedor | alonso@ecoplaza.com | Q0KlC36J4M_y |
| Caseta | leocaseta@ecoplaza.com | y62$3904h%$$3 |
| Finanzas | rosaquispef@ecoplaza.com | u$432##faYh1 |

---

## REGLAS OBLIGATORIAS

### Restriccion de Proyecto (CRITICO)
```
╔═══════════════════════════════════════════════════════════════════╗
║  RAIZ: E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard  ║
║                                                                   ║
║  - NUNCA salir de este directorio sin autorizacion                ║
║  - NUNCA leer/escribir en E:\Projects\ECOPLAZA_PROJECTS\docs\     ║
║  - NUNCA usar agentes de otros proyectos                          ║
║  - context/ esta AQUI, no en el padre                             ║
╚═══════════════════════════════════════════════════════════════════╝
```

### Investigacion Web
- **AÑO ACTUAL: 2026** - SIEMPRE buscar con "2026" en queries
- Buscar: "best practices 2026", "tutorial 2026", etc.
- NUNCA usar años anteriores (2025, 2024) en busquedas
- Priorizar documentacion oficial sobre blogs

### Git Commits
- **NO** incluir "Generated with Claude Code"
- **NO** incluir "Co-Authored-By: Claude"

### Codigo
- Filtrar SIEMPRE por proyecto_id
- Input number: SIEMPRE `onWheel={(e) => e.currentTarget.blur()}`
- Server Actions: NUNCA usar browser client

### docx-templates
- Comandos {IF}/{FOR} SOLOS en su parrafo
- ENTER para parrafo nuevo (no Shift+Enter)

---

## DOCUMENTACION

| Tipo | Ubicacion |
|------|-----------|
| Modulos | `docs/modulos/` |
| Sesiones | `docs/sesiones/` |
| Arquitectura | `docs/arquitectura/` |
| Requerimientos | `docs/requerimientos/` |

---

## TEST ASSETS (Imagenes de Prueba)

> Para pruebas con Playwright MCP y validacion de componentes

**Ubicacion:** `docs/test-assets/`

| Carpeta | Contenido |
|---------|-----------|
| `dni/` | DNI peruano frente/reverso |
| `vouchers/` | Comprobantes BCP, Interbank, BBVA |
| `contratos/` | PDFs de ejemplo |
| `otros/` | Documentos varios |

### Nombres de Archivo
```
dni-frente-01.jpg      # DNI anverso
dni-reverso-01.jpg     # DNI reverso
voucher-bcp-01.jpg     # Voucher BCP
voucher-interbank-01.jpg
```

### Uso en Playwright
```javascript
// Subir DNI en prueba
await page.setInputFiles('input[type="file"]',
  'docs/test-assets/dni/dni-frente-01.jpg'
);
```

Ver detalles completos en: `docs/test-assets/README.md`

---

## EMERGENCIAS

### Si login falla
1. Verificar Vercel logs
2. Revisar `context/BLOCKERS.md`
3. Rollback si necesario

### Si dashboard lento
1. Verificar COUNT en Supabase
2. Revisar `context/LESSONS_LEARNED.md` (keyset pagination)

---

**Ultima Actualizacion:** 9 Enero 2026
**Sesion:** 84+
