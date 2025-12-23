# NEXT_STEPS - EcoPlaza Dashboard

> Proximas acciones a ejecutar. Actualizar al cerrar cada sesion.

---

## Prioridad ALTA

### 1. Swagger UI - Deploy y Configuracion
- [x] Implementar Swagger UI con next-swagger-doc
- [x] Documentar endpoints: /api/public/proyectos, /api/extension/login, /api/extension/create-lead
- [x] Proteccion Basic Auth en produccion
- [ ] Agregar variables en Vercel: SWAGGER_USERNAME, SWAGGER_PASSWORD
- [ ] Verificar acceso en produccion: https://dashboard.ecoplaza.com/api/docs

### 2. Modulo Documentos - Completar
- [ ] Fase 7: Testing contratos Word en produccion
- [ ] Fase 8: Documentacion usuario final

---

## Prioridad MEDIA

### 3. Reporteria Multi-Proyecto
- [ ] Deploy pendiente (Sesion 72)
- [ ] Testing QA en staging
- [ ] Deploy a main

### 4. Sistema Evidencias
- [ ] Testing en staging
- [ ] Verificar upload funciona con diferentes formatos

---

## Prioridad BAJA (Futuro)

### Mejoras Pendientes
- [ ] Analytics de conversion (cuando haya recursos)
- [ ] Paginacion server-side (cuando lleguen a 8,000 leads)
- [ ] Dashboard morosidad (control pagos)
- [ ] Exportar comisiones a PDF/Excel

---

## Notas

- **Regla de Proyecto:** TODO se filtra por proyecto seleccionado en login
- **Testing:** Siempre usar PROYECTO PRUEBAS
- **Commits:** NO incluir "Generated with Claude Code" ni "Co-Authored-By"

---

**Ultima Actualizacion:** 23 Diciembre 2025
