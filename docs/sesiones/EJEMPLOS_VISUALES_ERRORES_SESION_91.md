# Ejemplos Visuales - Sistema de Errores Mejorado (Sesion 91)

**Fecha:** 13 Enero 2026
**Componente:** `app/expansion/registro/RegistroCorredorClient.tsx`

---

## Tabla de Contenidos
1. [Error de Validacion (Multiple)](#error-de-validacion-multiple)
2. [Error de Validacion (Unico)](#error-de-validacion-unico)
3. [Error de Sesion Expirada](#error-de-sesion-expirada)
4. [Error de Permisos](#error-de-permisos)
5. [Error de Red](#error-de-red)
6. [Error Generico](#error-generico)

---

## Error de Validacion (Multiple)

### Cuando aparece
Usuario hace clic en "Enviar para Revision" con 3+ campos invalidos/vacios

### Vista Desktop (1920x1080)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   🔴  Completa los siguientes campos                                   │
│                                                                         │
│   Hay 5 campo(s) que necesitan tu atencion antes de continuar          │
│                                                                         │
│   ┌───────────────────────────────────────────────────────────────┐   │
│   │                                                               │   │
│   │   ×  DNI debe ser 8 digitos                                   │   │
│   │                                                               │   │
│   │   ×  Celular debe tener 9 digitos                             │   │
│   │                                                               │   │
│   │   ×  El celular debe empezar con 9                            │   │
│   │                                                               │   │
│   │   ×  DNI (Reverso) es requerido                               │   │
│   │                                                               │   │
│   │   ×  Direccion declarada es requerida (minimo 10 caracteres)  │   │
│   │                                                               │   │
│   └───────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                         [Ir al primer campo]            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Vista Mobile (390x844 - iPhone 14)

```
┌──────────────────────────────────┐
│                                  │
│  🔴 Completa los siguientes      │
│     campos                       │
│                                  │
│  Hay 5 campo(s) que necesitan    │
│  tu atencion                     │
│                                  │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  │ × DNI debe ser 8 digitos   │  │
│  │                            │  │
│  │ × Celular debe tener 9     │  │
│  │   digitos                  │  │
│  │                            │  │
│  │ × El celular debe empezar  │  │
│  │   con 9                    │  │
│  │                            │  │
│  │ × DNI (Reverso) es         │  │
│  │   requerido                │  │
│  │                            │  │
│  │ × Direccion declarada es   │  │
│  │   requerida (minimo 10     │  │
│  │   caracteres)              │  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│      [Ir al primer campo]        │
│                                  │
└──────────────────────────────────┘
```

### Colores (Tailwind)
```
Fondo: bg-gradient-to-br from-red-50 to-orange-50
Borde: border-2 border-red-300
Icono contenedor: bg-red-100
Icono: text-red-600
Lista fondo: bg-white/70 backdrop-blur-sm border-red-200
Items: text-red-800
Boton: bg-red-600 hover:bg-red-700 text-white
```

---

## Error de Validacion (Unico)

### Cuando aparece
Solo 1 campo invalido

### Vista

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🔴  Completa los siguientes campos                           │
│                                                                 │
│   Hay 1 campo(s) que necesitan tu atencion antes de continuar  │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐   │
│   │                                                       │   │
│   │   ×  Email valido es requerido                        │   │
│   │                                                       │   │
│   └───────────────────────────────────────────────────────┘   │
│                                                                 │
│                                   [Ir al primer campo]          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error de Sesion Expirada

### Cuando aparece
Token JWT expirado, cookie invalida, o logout forzado

### Vista Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🟡  Sesion Expirada                                          │
│                                                                 │
│   Tu sesion ha expirado por seguridad. Por favor, inicia       │
│   sesion nuevamente para continuar con tu registro.            │
│                                                                 │
│   [👤 Iniciar Sesion]   [Cerrar]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Mobile

```
┌────────────────────────────────┐
│                                │
│  🟡 Sesion Expirada            │
│                                │
│  Tu sesion ha expirado por     │
│  seguridad. Por favor, inicia  │
│  sesion nuevamente para        │
│  continuar con tu registro.    │
│                                │
│  [👤 Iniciar Sesion]           │
│                                │
│  [Cerrar]                      │
│                                │
└────────────────────────────────┘
```

### Colores (Tailwind)
```
Fondo: bg-gradient-to-br from-yellow-50 to-amber-50
Borde: border-2 border-yellow-400
Icono contenedor: bg-yellow-100
Icono: text-yellow-700
Titulo: text-yellow-900
Texto: text-yellow-800
Boton primario: bg-yellow-600 hover:bg-yellow-700
Boton secundario: bg-white border-yellow-300 hover:bg-yellow-50 text-yellow-800
```

### Comportamiento del Boton
- "Iniciar Sesion" → `router.push('/login')`
- "Cerrar" → `setError(null)` (cierra el banner)

---

## Error de Permisos

### Cuando aparece
RLS policy rechaza la operacion, rol insuficiente

### Vista Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🟠  No tienes permiso                                        │
│                                                                 │
│   No tienes autorizacion para realizar esta accion. Por favor, │
│   contacta con el administrador o intenta iniciar sesion       │
│   nuevamente.                                                  │
│                                                                 │
│   [Iniciar Sesion]   [Cerrar]                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Mobile

```
┌────────────────────────────────┐
│                                │
│  🟠 No tienes permiso          │
│                                │
│  No tienes autorizacion para   │
│  realizar esta accion. Por     │
│  favor, contacta con el        │
│  administrador o intenta       │
│  iniciar sesion nuevamente.    │
│                                │
│  [Iniciar Sesion]              │
│                                │
│  [Cerrar]                      │
│                                │
└────────────────────────────────┘
```

### Colores (Tailwind)
```
Fondo: bg-gradient-to-br from-orange-50 to-red-50
Borde: border-2 border-orange-400
Icono contenedor: bg-orange-100
Icono: text-orange-700 (XCircle)
Titulo: text-orange-900
Texto: text-orange-800
Boton primario: bg-orange-600 hover:bg-orange-700
Boton secundario: bg-white border-orange-300 hover:bg-orange-50 text-orange-800
```

---

## Error de Red

### Cuando aparece
Timeout, sin conexion, servidor no responde

### Vista Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🔵  Error de Conexion                                        │
│                                                                 │
│   No se pudo conectar con el servidor. Verifica tu conexion a  │
│   internet e intenta nuevamente.                               │
│                                                                 │
│   [Reintentar]   [Cerrar]                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Mobile

```
┌────────────────────────────────┐
│                                │
│  🔵 Error de Conexion          │
│                                │
│  No se pudo conectar con el    │
│  servidor. Verifica tu         │
│  conexion a internet e intenta │
│  nuevamente.                   │
│                                │
│  [Reintentar]                  │
│                                │
│  [Cerrar]                      │
│                                │
└────────────────────────────────┘
```

### Colores (Tailwind)
```
Fondo: bg-gradient-to-br from-blue-50 to-cyan-50
Borde: border-2 border-blue-400
Icono contenedor: bg-blue-100
Icono: text-blue-700 (AlertCircle)
Titulo: text-blue-900
Texto: text-blue-800
Boton primario: bg-blue-600 hover:bg-blue-700
Boton secundario: bg-white border-blue-300 hover:bg-blue-50 text-blue-800
```

### Comportamiento del Boton
- "Reintentar" → `setError(null); handleSubmit();` (reintenta el envio)
- "Cerrar" → `setError(null)` (cierra el banner)

---

## Error Generico

### Cuando aparece
Cualquier error no clasificado en los anteriores

### Vista Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ❌  Error al Enviar Registro                                 │
│                                                                 │
│   Error al guardar los datos en el servidor                    │
│                                                                 │
│   Por favor, revisa los datos e intenta nuevamente. Si el      │
│   problema persiste, contacta con soporte.                     │
│                                                                 │
│   [Entendido]                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Mobile

```
┌────────────────────────────────┐
│                                │
│  ❌ Error al Enviar Registro   │
│                                │
│  Error al guardar los datos    │
│  en el servidor                │
│                                │
│  Por favor, revisa los datos   │
│  e intenta nuevamente. Si el   │
│  problema persiste, contacta   │
│  con soporte.                  │
│                                │
│  [Entendido]                   │
│                                │
└────────────────────────────────┘
```

### Colores (Tailwind)
```
Fondo: bg-gradient-to-br from-red-50 to-pink-50
Borde: border-2 border-red-300
Icono contenedor: bg-red-100
Icono: text-red-600 (XCircle)
Titulo: text-red-900
Mensaje principal: text-red-800
Mensaje secundario: text-xs text-red-600
Boton: bg-red-600 hover:bg-red-700 text-white
```

---

## Comportamiento de Campos con Error

### Campo Input Normal (Sin Error)
```
┌─────────────────────────────────────┐
│ Celular *                           │
├─────────────────────────────────────┤
│ [+51] [📱  999 999 999            ] │
└─────────────────────────────────────┘
```

### Campo Input con Error
```
┌─────────────────────────────────────┐
│ Celular * (texto rojo)              │
├─────────────────────────────────────┤
│ [+51] [📱  999 99                 ] │ ← Borde rojo
├─────────────────────────────────────┤
│ ⚠️ El celular debe tener 9 digitos  │ ← Mensaje rojo
└─────────────────────────────────────┘
```

### Clases Tailwind para Campos con Error
```css
/* Label */
text-red-600

/* Input */
border-red-400
focus:ring-red-200
focus:border-red-400

/* Icono */
text-red-400

/* Mensaje de error */
text-xs text-red-500 mt-1
```

---

## Secuencia de Animaciones

### 1. Aparicion del Banner (300ms)
```
animate-in fade-in slide-in-from-top-4 duration-300
```

### 2. Scroll al Primer Campo (500ms)
```javascript
element.scrollIntoView({
  behavior: 'smooth',
  block: 'center'
});
```

### 3. Focus en Campo (500ms delay)
```javascript
setTimeout(() => {
  element.focus();
}, 500);
```

### 4. Desaparicion del Banner (manual)
```
Usuario hace clic en "Cerrar" o corrige los errores
```

---

## Comportamiento en Diferentes Estados

### Estado: Borrador
- ✅ Todos los errores habilitados
- ✅ Scroll automatico funcional
- ✅ Limpieza en tiempo real activa

### Estado: Pendiente
- ❌ Formulario deshabilitado
- ❌ No se pueden hacer cambios
- ✅ Banner informativo amarillo "En revision"

### Estado: Observado
- ✅ Todos los errores habilitados
- ✅ Scroll automatico funcional
- ✅ Banner naranja con observaciones
- ✅ Boton "Reenviar" disponible

### Estado: Aprobado
- ❌ Formulario deshabilitado
- ✅ Banner verde "Aprobado"
- ❌ No se pueden hacer cambios

### Estado: Rechazado
- ❌ Formulario deshabilitado
- ✅ Banner rojo con motivo
- ❌ No se pueden hacer cambios

---

## Mejores Practicas de UX Aplicadas

### 1. Especificidad
❌ "Error al enviar"
✅ "DNI debe tener 8 digitos"

### 2. Contexto
❌ "Dato invalido"
✅ "El celular debe empezar con 9"

### 3. Accionabilidad
❌ "Revisa los datos"
✅ [Ir al primer campo] + scroll automatico

### 4. Prevencion
✅ Limpieza de errores en tiempo real
✅ Validacion antes de enviar al servidor

### 5. Feedback Visual
✅ Colores diferenciados por tipo
✅ Iconos descriptivos
✅ Animaciones suaves

### 6. Accesibilidad
✅ Contraste suficiente (WCAG AA)
✅ Mensajes claros en texto
✅ Focus automatico en campos
✅ Scroll suave sin saltos bruscos

---

## Palabras Clave para Deteccion de Errores

### Sesion Expirada
```
token | sesion | session | autenticacion | authentication
```

### Permisos
```
permiso | permission | autorizado | unauthorized | RLS
```

### Red
```
red | network | conexion | connection | timeout
```

### Ejemplos de Deteccion
```typescript
"JWT token expired" → 'session'
"No tienes autorizacion" → 'permission'
"Network timeout" → 'network'
"Database error" → 'unknown'
```

---

## Testing Checklist

### Error de Validacion
- [ ] Aparece banner rojo con lista
- [ ] Click "Ir al primer campo" hace scroll
- [ ] Campo queda centrado en pantalla
- [ ] Campo recibe focus automaticamente
- [ ] Contador de errores es correcto
- [ ] Corregir campo elimina error de la lista
- [ ] Corregir todos cierra el banner

### Error de Sesion
- [ ] Aparece banner amarillo
- [ ] Boton "Iniciar Sesion" redirige a /login
- [ ] Mensaje es claro y no tecnico

### Error de Permisos
- [ ] Aparece banner naranja
- [ ] Mensaje sugiere contactar admin
- [ ] Boton "Iniciar Sesion" funciona

### Error de Red
- [ ] Aparece banner azul
- [ ] Boton "Reintentar" vuelve a intentar
- [ ] Si funciona, banner desaparece

### Responsive
- [ ] Desktop (1920x1080) se ve bien
- [ ] Laptop (1366x768) se ve bien
- [ ] Tablet (768x1024) se ve bien
- [ ] Mobile (390x844) se ve bien
- [ ] Texto se ajusta sin overflow

---

**Creado:** 13 Enero 2026
**Version:** 1.0
**Autor:** Frontend Developer (Claude Code)
