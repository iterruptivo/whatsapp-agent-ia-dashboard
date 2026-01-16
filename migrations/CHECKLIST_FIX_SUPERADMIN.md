# CHECKLIST: Fix Superadmin - Reuniones

## Antes de Aplicar el Fix

- [ ] Confirmar que el error persiste (intentar crear reunión como gerente.ti)
- [ ] Tener acceso a Supabase Dashboard del proyecto
- [ ] Tener permisos para ejecutar SQL en Supabase

---

## Ejecutar el Fix

- [ ] 1. Ir a: https://supabase.com/dashboard
- [ ] 2. Seleccionar proyecto EcoPlaza
- [ ] 3. Click en "SQL Editor" (sidebar)
- [ ] 4. Click en "New Query"
- [ ] 5. Abrir archivo: `migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql`
- [ ] 6. Copiar TODO el contenido del archivo
- [ ] 7. Pegar en el SQL Editor de Supabase
- [ ] 8. Click en "Run" (o presionar Ctrl + Enter)
- [ ] 9. Esperar a que termine (debe tardar ~3 segundos)

---

## Verificar que el Fix Funcionó

Buscar estos mensajes en el output de Supabase:

- [ ] ✓ "Estado: OK - Policy ahora incluye superadmin"
- [ ] ✓ "Policy Reuniones - Insert actualizada"
- [ ] ✓ "Roles permitidos para INSERT: superadmin, admin, gerencia, jefe_ventas"

---

## Probar que Funciona

- [ ] 1. Abrir el dashboard: https://tu-dashboard.vercel.app
- [ ] 2. Login como: gerente.ti@ecoplaza.com.pe
- [ ] 3. Ir al módulo "Reuniones"
- [ ] 4. Click en "Nueva Reunión" o "Subir Audio/Video"
- [ ] 5. Intentar crear una reunión
- [ ] 6. Debe funcionar SIN errores

---

## Si el Error Persiste

- [ ] Ejecutar script de diagnóstico: `migrations/diagnose_rls_reuniones.sql`
- [ ] Verificar que el usuario es superadmin:
  ```sql
  SELECT rol FROM usuarios WHERE email = 'gerente.ti@ecoplaza.com.pe';
  ```
- [ ] Logout y login nuevamente en el dashboard
- [ ] Revisar logs del navegador (F12 → Console)
- [ ] Contactar al equipo técnico con capturas de pantalla

---

## Documentar (Post-Fix)

- [ ] Marcar fecha de ejecución aquí: ____________
- [ ] Actualizar `context/CURRENT_STATE.md` marcando como resuelto
- [ ] Agregar nota en chat/Slack/correo que el problema fue resuelto

---

## Archivo Ejecutado

`migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql`

Fecha de creación: 16 Enero 2026
Tiempo estimado: 30 segundos
Riesgo: BAJO
