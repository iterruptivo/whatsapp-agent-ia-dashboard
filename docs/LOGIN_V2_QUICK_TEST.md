# Login V2 - Test Rápido (5 minutos)

## URL
```
http://localhost:3000/login-v2
```

## Test 1: Flujo Exitoso (2 min)

### Paso 1: Abrir página
1. Navegar a: http://localhost:3000/login-v2
2. Verificar que solo se ven Email y Password
3. Botón dice "Iniciar Sesión"

### Paso 2: Ingresar credenciales
```
Email:    gerencia@ecoplaza.com
Password: q0#CsgL8my3$
```

### Paso 3: Click "Iniciar Sesión"
- Botón cambia a "Validando..." con spinner
- Esperar 1-2 segundos

### Paso 4: Verificar mensaje de bienvenida
- Aparece mensaje verde: "¡Bienvenido/a, Gerencia!"
- Animación slideDown del mensaje
- Aparece selector de proyectos con animación
- Email/Password se atenúan (50% opacidad)
- Botón cambia a "Continuar"

### Paso 5: Seleccionar proyecto
- Seleccionar "Proyecto Pruebas"

### Paso 6: Click "Continuar"
- Botón cambia a "Ingresando..." con spinner
- Redirección al dashboard en 1-2 segundos

**✅ FLUJO EXITOSO COMPLETADO**

---

## Test 2: Credenciales Inválidas (1 min)

1. Navegar a: http://localhost:3000/login-v2
2. Ingresar:
   ```
   Email:    test@test.com
   Password: wrong-password
   ```
3. Click "Iniciar Sesión"
4. Verificar:
   - Mensaje rojo de error
   - Animación shake
   - Texto: "Credenciales inválidas"
   - Botón vuelve a "Iniciar Sesión"

**✅ ERROR HANDLING FUNCIONA**

---

## Test 3: Sin Seleccionar Proyecto (1 min)

1. Navegar a: http://localhost:3000/login-v2
2. Ingresar credenciales válidas (gerencia@ecoplaza.com)
3. Click "Iniciar Sesión"
4. Esperar mensaje de bienvenida
5. NO seleccionar proyecto
6. Click "Continuar"
7. Verificar:
   - Mensaje rojo: "Por favor selecciona un proyecto"
   - Animación shake
   - Botón sigue siendo "Continuar"

**✅ VALIDACIÓN DE PROYECTO FUNCIONA**

---

## Test 4: Reportería (1 min)

1. Navegar a: http://localhost:3000/login-v2
2. Ingresar credenciales válidas (gerencia@ecoplaza.com)
3. Click "Iniciar Sesión"
4. Seleccionar "📊 Reportería"
5. Click "Continuar"
6. Verificar redirección a: http://localhost:3000/reporteria

**✅ MODO REPORTERÍA FUNCIONA**

---

## Checklist Visual Rápido

Estado inicial:
- [ ] Solo Email y Password visibles
- [ ] Botón "Iniciar Sesión"
- [ ] Logo EcoPlaza en header
- [ ] Degradado verde/azul en header

Después de validar:
- [ ] Mensaje verde con check icon
- [ ] Texto "¡Bienvenido/a, [NOMBRE]!"
- [ ] Selector de proyectos aparece con animación
- [ ] Email/Password atenúan al 50%
- [ ] Botón cambia a "Continuar"

En error:
- [ ] Mensaje rojo con icono de alerta
- [ ] Animación shake
- [ ] Texto descriptivo del error

---

## Screenshot Recomendados

1. **Estado inicial** - Página cargada
2. **Mensaje de bienvenida** - Después de validar credenciales
3. **Error** - Credenciales inválidas
4. **Logging in** - Después de seleccionar proyecto

---

## Comandos Útiles

### Ver logs del servidor
```bash
cat "C:\Users\ALONSO~1\AppData\Local\Temp\claude\E--Projects-ECOPLAZA-PROJECTS-whatsapp-agent-ia-dashboard\tasks\bb5e98b.output" | tail -30
```

### Verificar servidor corriendo
```bash
curl -I http://localhost:3000/login-v2
```

### Reiniciar servidor (si necesario)
```bash
# 1. Encontrar PID
netstat -ano | findstr :3000

# 2. Matar proceso
taskkill //F //PID <PID>

# 3. Reiniciar
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard
npm run dev
```

---

## Resultado Esperado

- ✅ Login V2 funciona perfectamente
- ✅ Animaciones suaves y profesionales
- ✅ Flujo intuitivo de 2 pasos
- ✅ Previene exposición de proyectos sin autenticar
- ✅ Compatible con V1 (ambos funcionan)
- ✅ Modo reportería funciona
- ✅ Validación de errores robusta

---

**Tiempo total:** ~5 minutos
**Fecha:** 7 Enero 2026
