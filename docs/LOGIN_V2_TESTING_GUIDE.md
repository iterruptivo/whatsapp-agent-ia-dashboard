# Guía de Testing Manual - Login V2

## URL de Acceso
```
http://localhost:3000/login-v2
```

## Checklist de Validación Visual

### Estado 1: IDLE (Inicial)
- [ ] Se muestran solo campos Email y Password
- [ ] Botón dice "Iniciar Sesión"
- [ ] NO se muestra selector de proyectos
- [ ] NO hay mensajes de error ni éxito
- [ ] Header con logo EcoPlaza y degradado verde/azul

### Estado 2: VALIDATING (Validando credenciales)
**Trigger:** Click en "Iniciar Sesión" con credenciales ingresadas

- [ ] Botón cambia a "Validando..." con spinner
- [ ] Campos email/password se deshabilitan
- [ ] Spinner blanco girando en el botón

### Estado 3: ERROR (Credenciales inválidas)
**Trigger:** Ingresar credenciales incorrectas

- [ ] Aparece mensaje rojo con icono de alerta
- [ ] Texto: "Error de autenticación" + detalle del error
- [ ] Animación shake en el mensaje de error
- [ ] Botón vuelve a "Iniciar Sesión"
- [ ] Campos se rehabilitan para reintentar

### Estado 4: CREDENTIALS_VALID (Credenciales validadas)
**Trigger:** Ingresar credenciales correctas (ej: gerencia@ecoplaza.com)

- [ ] Aparece mensaje verde: "¡Bienvenido/a, [NOMBRE]! Selecciona tu proyecto para continuar"
- [ ] Icono de check verde en el mensaje
- [ ] Animación slideDown del mensaje de bienvenida
- [ ] Campos email/password bajan opacidad al 50%
- [ ] Aparece selector de proyectos con animación slideDown
- [ ] Selector muestra lista de proyectos + opción "Reportería"
- [ ] Botón cambia a "Continuar"
- [ ] Transición suave de todos los elementos (500ms)

### Estado 5: LOGGING_IN (Ingresando al sistema)
**Trigger:** Seleccionar proyecto y click en "Continuar"

- [ ] Botón cambia a "Ingresando..." con spinner
- [ ] Selector de proyectos se deshabilita
- [ ] Spinner blanco girando en el botón
- [ ] Mensaje de bienvenida verde sigue visible

## Pruebas Funcionales

### Test 1: Flujo Completo Exitoso
```
1. Navegar a http://localhost:3000/login-v2
2. Ingresar: gerencia@ecoplaza.com
3. Ingresar: q0#CsgL8my3$
4. Click "Iniciar Sesión"
5. Esperar mensaje "¡Bienvenido/a, Gerencia!"
6. Verificar aparición del selector de proyectos
7. Seleccionar "Proyecto Pruebas"
8. Click "Continuar"
9. Verificar redirección a /dashboard
```

**Resultado esperado:** Login exitoso, redirección al dashboard

### Test 2: Email Inválido
```
1. Navegar a http://localhost:3000/login-v2
2. Ingresar: "correo-invalido"
3. Ingresar: "cualquier-password"
4. Click "Iniciar Sesión"
```

**Resultado esperado:** Mensaje de error "Por favor ingresa un email válido" + shake

### Test 3: Credenciales Incorrectas
```
1. Navegar a http://localhost:3000/login-v2
2. Ingresar: test@test.com
3. Ingresar: password-incorrecta
4. Click "Iniciar Sesión"
```

**Resultado esperado:** Mensaje de error "Credenciales inválidas" + shake

### Test 4: Sin Seleccionar Proyecto
```
1. Navegar a http://localhost:3000/login-v2
2. Ingresar: gerencia@ecoplaza.com
3. Ingresar: q0#CsgL8my3$
4. Click "Iniciar Sesión"
5. Esperar mensaje de bienvenida
6. NO seleccionar proyecto
7. Click "Continuar"
```

**Resultado esperado:** Mensaje de error "Por favor selecciona un proyecto" + shake

### Test 5: Modo Reportería (Admin)
```
1. Navegar a http://localhost:3000/login-v2
2. Ingresar: gerencia@ecoplaza.com
3. Ingresar: q0#CsgL8my3$
4. Click "Iniciar Sesión"
5. Seleccionar "📊 Reportería"
6. Click "Continuar"
```

**Resultado esperado:** Redirección a /reporteria

### Test 6: Cuenta Desactivada
```
(Requiere usuario desactivado en la base de datos)
1. Navegar a http://localhost:3000/login-v2
2. Ingresar email de usuario desactivado
3. Ingresar password correcta
4. Click "Iniciar Sesión"
```

**Resultado esperado:** Mensaje "Tu cuenta ha sido desactivada. Contacta al administrador."

## Validación de Animaciones

### Animación Shake (Error)
**Timing:** 500ms
**Trigger:** Cualquier error

Verificar:
- [ ] El mensaje se mueve horizontalmente (-5px, +5px)
- [ ] 5 movimientos completos
- [ ] Retorna a posición original
- [ ] Animación suave (ease-in-out)

### Animación SlideDown (Bienvenida)
**Timing:** 500ms
**Trigger:** Credenciales validadas

Verificar:
- [ ] Mensaje aparece desde arriba (-10px)
- [ ] Opacidad de 0 a 100
- [ ] Movimiento vertical suave
- [ ] Animación ease-out

### Animación SlideDown (Selector Proyectos)
**Timing:** 500ms
**Trigger:** Credenciales validadas

Verificar:
- [ ] max-height de 0 a 128px (h-32)
- [ ] Opacidad de 0 a 100
- [ ] Translate Y de -4 a 0
- [ ] Transición ease-in-out
- [ ] Overflow hidden durante animación

### Transiciones de Opacidad (Email/Password)
**Timing:** 500ms
**Trigger:** Credenciales validadas

Verificar:
- [ ] Opacidad baja de 100% a 50%
- [ ] Transición suave
- [ ] Campos permanecen deshabilitados

## Validación Responsive

### Desktop (1920x1080)
- [ ] Card centrado
- [ ] Ancho máximo 448px (max-w-md)
- [ ] Espaciado correcto
- [ ] Sombras visibles

### Tablet (768x1024)
- [ ] Card centrado
- [ ] Márgenes de 16px (mx-4)
- [ ] Elementos legibles
- [ ] Botones táctiles (44px altura mínima)

### Mobile (375x667)
- [ ] Card ocupa ancho completo menos márgenes
- [ ] Campos de formulario responsivos
- [ ] Botón "Continuar" visible sin scroll
- [ ] Texto legible

## Validación de Accesibilidad

### Teclado
- [ ] Tab navega entre campos en orden lógico
- [ ] Enter en email → focus a password
- [ ] Enter en password → submit form
- [ ] Enter en selector proyectos → submit form (paso 2)
- [ ] Focus visible en todos los elementos interactivos

### Screen Readers
- [ ] Labels asociados correctamente (htmlFor)
- [ ] Mensajes de error anunciados
- [ ] Estado del botón anunciado (loading, habilitado, deshabilitado)

## Validación de Performance

### Tiempos de Respuesta
- [ ] Validación de credenciales < 1s
- [ ] Login completo < 2s
- [ ] Animaciones a 60fps (sin lag)

### Network
- [ ] Solo 1 request para validar credenciales
- [ ] Solo 1 request para login final
- [ ] No hay requests innecesarios

## Checklist de Seguridad

- [ ] Password type="password" (no visible)
- [ ] No se muestra lista de proyectos antes de autenticar
- [ ] Credenciales no se exponen en console.log
- [ ] Error messages no revelan información sensible
- [ ] Sign out automático después de validación

## Browser Compatibility

### Chrome (Recomendado)
- [ ] Animaciones suaves
- [ ] Degradados correctos
- [ ] Spinner funciona

### Firefox
- [ ] Animaciones suaves
- [ ] Degradados correctos
- [ ] Spinner funciona

### Edge
- [ ] Animaciones suaves
- [ ] Degradados correctos
- [ ] Spinner funciona

### Safari (si aplica)
- [ ] Animaciones suaves
- [ ] Degradados correctos
- [ ] Spinner funciona

## Notas para Screenshots

### Screenshot 1: Estado Inicial
Capturar: `http://localhost:3000/login-v2` (página cargada)

### Screenshot 2: Validando
Capturar: Inmediatamente después de click en "Iniciar Sesión"

### Screenshot 3: Error
Capturar: Después de ingresar credenciales inválidas

### Screenshot 4: Bienvenida + Selector
Capturar: Después de credenciales válidas (estado más importante)

### Screenshot 5: Logging In
Capturar: Después de seleccionar proyecto y click "Continuar"

---

**Última actualización:** 7 Enero 2026
**Estado:** Pendiente ejecución
