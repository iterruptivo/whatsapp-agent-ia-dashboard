# Login V2 - Flujo de 2 Pasos con Animaciones Premium

## Resumen

Se implementó un nuevo flujo de login en 2 pasos para evitar que scrapers obtengan la lista de proyectos antes de autenticarse.

## Archivos Creados

### 1. API de Validación de Credenciales
**Ruta:** `app/api/auth/validate-credentials/route.ts`

**Funcionalidad:**
- Valida email y contraseña SIN requerir proyecto
- Retorna información básica del usuario si las credenciales son válidas
- Hace sign out inmediato (solo valida, no mantiene sesión)
- Verifica que el usuario esté activo

**Request:**
```json
POST /api/auth/validate-credentials
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (éxito):**
```json
{
  "success": true,
  "user": {
    "nombre": "Juan Perez",
    "email": "user@example.com"
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "error": "Credenciales inválidas"
}
```

### 2. Login V2 Page
**Ruta:** `app/login-v2/page.tsx`

**Características:**
- State Machine con 5 estados: `idle`, `validating`, `credentials_valid`, `logging_in`, `error`
- Animaciones CSS premium (shake, slideDown)
- Transiciones suaves con Tailwind
- Dos pasos bien diferenciados

## Flujo de Usuario

### Paso 1: Validación de Credenciales
1. Usuario ingresa email y contraseña
2. Click en "Iniciar Sesión"
3. Estado → `validating` (botón muestra "Validando..." con spinner)
4. Se llama a `/api/auth/validate-credentials`
5. Si es exitoso → Estado → `credentials_valid`

### Paso 2: Selección de Proyecto
1. Aparece mensaje verde: "¡Bienvenido/a, [nombre]! Selecciona tu proyecto para continuar"
2. Los campos email/password se desactivan y bajan la opacidad (50%)
3. Aparece el selector de proyectos con animación slideDown
4. El botón cambia a "Continuar"
5. Usuario selecciona proyecto y hace click en "Continuar"
6. Estado → `logging_in` (botón muestra "Ingresando..." con spinner)
7. Se ejecuta el login normal con proyecto incluido
8. Redirección al dashboard

## Animaciones Implementadas

### 1. Shake (Error)
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
```
- Se aplica al mensaje de error
- Duración: 0.5s
- Trigger: Cuando `loginState === 'error'`

### 2. SlideDown (Revelación)
```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```
- Se aplica al mensaje de bienvenida y selector de proyectos
- Duración: 0.5s
- Trigger: Cuando se revelan elementos después de validación exitosa

### 3. Expansion del Formulario
```css
transition-all duration-500 ease-in-out overflow-hidden
```
- El selector de proyectos pasa de `max-h-0` a `max-h-32`
- La opacidad pasa de 0 a 100
- La posición Y pasa de `-translate-y-4` a `translate-y-0`

## Estados Visuales

| Estado | Email/Password | Proyecto | Botón | Mensaje |
|--------|---------------|----------|-------|---------|
| `idle` | Habilitados | Oculto | "Iniciar Sesión" | - |
| `validating` | Deshabilitados | Oculto | "Validando..." (spinner) | - |
| `credentials_valid` | Deshabilitados (opacidad 50%) | Visible + animación | "Continuar" | Verde: "Bienvenido [nombre]!" |
| `logging_in` | Deshabilitados (opacidad 50%) | Deshabilitado | "Ingresando..." (spinner) | Verde: "Bienvenido [nombre]!" |
| `error` | Habilitados | Oculto (o visible si ya estaba) | "Iniciar Sesión" o "Continuar" | Rojo: Mensaje de error + shake |

## Seguridad

### Protección contra Scrapers
- Los proyectos NO se cargan hasta que las credenciales son validadas
- La API `validate-credentials` no expone información sensible
- Si un scraper intenta acceder directamente a `/api/auth/validate-credentials` sin credenciales válidas, recibe un 401

### Manejo de Sesiones
- La validación NO crea una sesión permanente
- Se hace sign out inmediato después de validar
- El login real ocurre solo después de seleccionar el proyecto

## Compatibilidad

### Login V1 (Original)
**Ruta:** `app/login/page.tsx`
- Se mantiene sin cambios
- Sigue funcionando normalmente
- Muestra proyectos desde el inicio

### Login V2 (Nuevo)
**Ruta:** `app/login-v2/page.tsx`
- Flujo de 2 pasos
- Animaciones premium
- Mejor UX para prevenir scrapers

## Acceso

- **Login V1:** `http://localhost:3000/login`
- **Login V2:** `http://localhost:3000/login-v2`

## Testing

### Credenciales de Prueba (Proyecto PRUEBAS)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | gerencia@ecoplaza.com | q0#CsgL8my3$ |
| Jefe Ventas | leojefeventas@ecoplaza.com | 67hgs53899# |
| Vendedor | alonso@ecoplaza.com | Q0KlC36J4M_y |

### Casos de Prueba

1. **Credenciales inválidas (paso 1)**
   - Ingresar email/password incorrectos
   - Esperado: Mensaje de error rojo + shake animation

2. **Credenciales válidas (paso 1)**
   - Ingresar credenciales correctas
   - Esperado: Mensaje verde de bienvenida + aparición del selector de proyectos

3. **Sin seleccionar proyecto (paso 2)**
   - Validar credenciales y hacer click en "Continuar" sin seleccionar proyecto
   - Esperado: Mensaje de error

4. **Login completo exitoso**
   - Validar credenciales → Seleccionar proyecto → Click "Continuar"
   - Esperado: Redirección al dashboard

5. **Cuenta desactivada**
   - Ingresar credenciales de usuario desactivado
   - Esperado: Mensaje de error específico

6. **Reportería mode**
   - Validar credenciales → Seleccionar "Reportería" → Click "Continuar"
   - Esperado: Redirección a `/reporteria` (solo para admin/jefe_ventas/marketing)

## Próximos Pasos

1. **Validación con Playwright MCP:**
   - Navegar a `/login-v2`
   - Capturar screenshots de cada estado
   - Verificar animaciones
   - Probar flujo completo

2. **Considerar migración:**
   - Si el login v2 funciona bien, considerar reemplazar login v1
   - O mantener ambas versiones según necesidad del cliente

3. **Analytics:**
   - Agregar tracking de eventos (paso 1 exitoso, paso 2 exitoso, errores)

## Notas Técnicas

- Se usan los mismos estilos y colores del login original (consistencia visual)
- Las animaciones son nativas CSS (no requieren librerías adicionales)
- El state machine facilita el debugging y mantenimiento
- Compatible con modo Reportería
- Compatible con multi-proyecto

---

**Fecha de implementación:** 7 Enero 2026
**Desarrollado por:** Frontend Developer Agent
**Status:** ✅ Implementado, pendiente validación con Playwright
