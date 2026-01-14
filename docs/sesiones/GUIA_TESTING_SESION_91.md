# Guia de Testing - Sesion 91 (Mejoras UX Errores)

**Fecha:** 13 Enero 2026
**Modulo:** Expansion - Registro de Corredores
**Tiempo Estimado:** 30 minutos

---

## Pre-requisitos

### 1. Servidor Corriendo
```bash
# Verificar que el servidor esta en puerto 3000
curl http://localhost:3000

# Deberia retornar: /login?redirect=%2F
```

### 2. Base de Datos
- Supabase debe estar accesible
- Tabla `expansion_registros_corredores` debe existir
- Tabla `expansion_corredores_documentos` debe existir

### 3. Credenciales de Testing
Usar cuenta de corredor (NO admin):
- Email: `[nuevo_corredor]@test.com`
- O crear cuenta nueva en `/registro-corredor`

---

## Flujo de Testing Completo

### Paso 1: Acceder al Formulario

**URL:** `http://localhost:3000/expansion/registro`

**Credenciales:**
- Crear cuenta nueva o usar existente
- No importa el rol (todos pueden registrarse como corredor)

**Estado Esperado:**
- Formulario en blanco si es primera vez
- Formulario con datos guardados si ya hay borrador

---

## Escenarios de Testing

### Escenario 1: Error de Validacion Multiple

**Objetivo:** Verificar que se muestran todos los errores de validacion

#### Pasos:
1. Acceder a `/expansion/registro`
2. NO subir ningun documento
3. NO llenar ningun campo
4. Hacer clic en "Enviar para Revision"

#### Resultado Esperado:
```
┌───────────────────────────────────────────────┐
│ 🔴 Completa los siguientes campos             │
├───────────────────────────────────────────────┤
│ Hay 8+ campo(s) que necesitan tu atencion    │
│                                               │
│ × DNI (Frente) es requerido                   │
│ × DNI (Reverso) es requerido                  │
│ × Recibo de Luz o Agua es requerido          │
│ × Declaracion Jurada es requerida            │
│ × Email valido es requerido                   │
│ × Celular es requerido                        │
│ × DNI es requerido                            │
│ × Nombres es requerido                        │
│ ...                                           │
│                       [Ir al primer campo]    │
└───────────────────────────────────────────────┘
```

#### Verificaciones:
- [ ] Banner rojo aparece
- [ ] Lista muestra 8+ errores
- [ ] Boton "Ir al primer campo" visible
- [ ] Todos los mensajes son especificos (no genericos)

---

### Escenario 2: Scroll Automatico

**Objetivo:** Verificar que el scroll lleva al primer campo con error

#### Pasos:
1. Acceder a `/expansion/registro`
2. Hacer scroll hasta el FINAL del formulario
3. Dejar el primer campo (Tipo de Persona) SIN seleccionar
4. Hacer clic en "Enviar para Revision"
5. Aparece banner de error
6. Hacer clic en "Ir al primer campo"

#### Resultado Esperado:
- Scroll suave hacia arriba
- Primer campo con error (DNI Frente) queda centrado en pantalla
- Campo recibe focus automaticamente (borde azul)
- Duracion del scroll: ~500ms

#### Verificaciones:
- [ ] Scroll es suave (no salto brusco)
- [ ] Campo queda centrado verticalmente
- [ ] Focus visible en el campo
- [ ] No hay "bounce" o movimientos extra

---

### Escenario 3: Correccion en Tiempo Real

**Objetivo:** Verificar que los errores desaparecen al corregir

#### Pasos:
1. Generar errores de validacion (seguir Escenario 1)
2. Banner muestra 8+ errores
3. Subir DNI Frente (primera imagen)

#### Resultado Esperado (Inmediato):
- Error "DNI (Frente) es requerido" DESAPARECE de la lista
- Contador cambia de "8 campo(s)" → "7 campo(s)"
- Campo DNI Frente ya NO tiene borde rojo

#### Continuar:
4. Llenar Email con formato valido (ej: test@example.com)
5. Error "Email valido es requerido" desaparece
6. Contador cambia a "6 campo(s)"

#### Verificaciones:
- [ ] Errores desaparecen SIN refrescar pagina
- [ ] Contador se actualiza correctamente
- [ ] Bordes rojos desaparecen al corregir
- [ ] Banner se cierra cuando errores = 0

---

### Escenario 4: Validacion de Celular

**Objetivo:** Verificar mensajes especificos de celular

#### Pasos:
1. Campo "Celular" → Dejar vacio → Enviar
   - **Esperado:** "Celular es requerido"

2. Campo "Celular" → Escribir "12345" → Enviar
   - **Esperado:** "El celular debe tener 9 digitos"

3. Campo "Celular" → Escribir "812345678" → Enviar
   - **Esperado:** "El celular debe empezar con 9"

4. Campo "Celular" → Escribir "912345678" → Enviar
   - **Esperado:** Error desaparece (celular valido)

#### Verificaciones:
- [ ] Cada error muestra mensaje especifico
- [ ] No hay error generico "Campo invalido"
- [ ] Auto-formato funciona (999 999 999)

---

### Escenario 5: Validacion de DNI

**Objetivo:** Verificar formato de DNI

#### Pasos:
1. Campo "DNI" → Escribir "123" → Enviar
   - **Esperado:** "DNI debe ser 8 digitos"

2. Campo "DNI" → Escribir "1234567a" → Enviar
   - **Esperado:** "DNI debe ser 8 digitos"

3. Campo "DNI" → Escribir "12345678" → Enviar
   - **Esperado:** Error desaparece (DNI valido)

#### Verificaciones:
- [ ] maxLength={8} funciona (no deja escribir mas)
- [ ] Valida solo numeros
- [ ] Mensaje es claro

---

### Escenario 6: Validacion de Documentos

**Objetivo:** Verificar que todos los documentos son requeridos

#### Pasos:
1. Subir solo DNI Frente
2. Hacer clic en "Enviar"

#### Resultado Esperado:
```
× DNI (Reverso) es requerido
× Recibo de Luz o Agua es requerido
× Declaracion Jurada es requerida
```

#### Continuar:
3. Subir DNI Reverso
4. Error "DNI (Reverso)" desaparece
5. Subir Recibo
6. Error "Recibo" desaparece
7. Subir Declaracion Jurada
8. Error "Declaracion" desaparece

#### Verificaciones:
- [ ] Cada documento tiene error especifico
- [ ] Ring rojo alrededor del componente con error
- [ ] Ring desaparece al subir documento
- [ ] Mensajes son claros

---

### Escenario 7: Formulario Completo

**Objetivo:** Envio exitoso sin errores

#### Pasos:
1. Llenar todos los campos obligatorios:
   - Tipo: Persona Natural
   - DNI Frente: Subir imagen
   - DNI Reverso: Subir imagen
   - Recibo: Subir imagen
   - Declaracion: Subir imagen
   - Email: test@example.com
   - Celular: 912345678
   - DNI: 12345678
   - Nombres: Juan
   - Apellido Paterno: Perez
   - Apellido Materno: Lopez
   - Direccion: Av. Ejemplo 123, Lima, Peru

2. Hacer clic en "Guardar Borrador"
   - **Esperado:** Banner verde "Datos y documentos guardados correctamente"

3. Hacer clic en "Enviar para Revision"
   - **Esperado:** Banner verde "Registro enviado para revision"
   - **Esperado:** Estado cambia a "Pendiente"

#### Verificaciones:
- [ ] No aparece ningun error
- [ ] Banner de exito es verde
- [ ] Estado cambia correctamente
- [ ] Formulario se deshabilita (estado pendiente)

---

## Escenarios de Error de Sistema

### Escenario 8: Error de Sesion (Simulado)

**NOTA:** Este escenario requiere manipular cookies manualmente

#### Pasos:
1. Llenar formulario completo
2. Abrir DevTools (F12) → Application → Cookies
3. Borrar cookie `sb-access-token`
4. Hacer clic en "Enviar para Revision"

#### Resultado Esperado:
```
┌───────────────────────────────────────────┐
│ 🟡 Sesion Expirada                        │
├───────────────────────────────────────────┤
│ Tu sesion ha expirado por seguridad.      │
│ Por favor, inicia sesion nuevamente       │
│ para continuar con tu registro.           │
├───────────────────────────────────────────┤
│ [👤 Iniciar Sesion]   [Cerrar]            │
└───────────────────────────────────────────┘
```

#### Verificaciones:
- [ ] Banner amarillo aparece
- [ ] Mensaje es claro y no tecnico
- [ ] Boton "Iniciar Sesion" redirige a /login
- [ ] Boton "Cerrar" cierra el banner

---

### Escenario 9: Error de Red (Simulado)

**NOTA:** Este escenario requiere simular desconexion

#### Pasos:
1. Llenar formulario completo
2. DevTools (F12) → Network → Throttling → Offline
3. Hacer clic en "Enviar para Revision"

#### Resultado Esperado:
```
┌───────────────────────────────────────────┐
│ 🔵 Error de Conexion                      │
├───────────────────────────────────────────┤
│ No se pudo conectar con el servidor.      │
│ Verifica tu conexion a internet e         │
│ intenta nuevamente.                       │
├───────────────────────────────────────────┤
│ [Reintentar]   [Cerrar]                   │
└───────────────────────────────────────────┘
```

#### Continuar:
4. DevTools → Network → Throttling → Online
5. Hacer clic en "Reintentar"
6. Deberia enviar exitosamente

#### Verificaciones:
- [ ] Banner azul aparece
- [ ] Mensaje diagnostica el problema
- [ ] Boton "Reintentar" funciona
- [ ] Envio exitoso despues de reconectar

---

## Testing Responsive

### Desktop (1920x1080)
- [ ] Banner ocupa max-width razonable
- [ ] Lista de errores legible
- [ ] Botones bien alineados
- [ ] Sin overflow horizontal

### Laptop (1366x768)
- [ ] Banner ajusta ancho correctamente
- [ ] Scroll funciona en ventanas pequeñas
- [ ] Botones accesibles

### Tablet (768x1024)
- [ ] Layout cambia a columna unica
- [ ] Botones se apilan verticalmente
- [ ] Texto legible sin zoom

### Mobile (390x844 - iPhone 14)
- [ ] Banner responsive
- [ ] Lista de errores sin scroll horizontal
- [ ] Botones touch-friendly (min 44x44px)
- [ ] Texto legible sin zoom

---

## Checklist de Mensajes de Validacion

### Documentos
- [ ] "DNI (Frente) es requerido"
- [ ] "DNI (Reverso) es requerido"
- [ ] "Recibo de Luz o Agua es requerido"
- [ ] "Declaracion Jurada es requerida"

### Email
- [ ] "Email valido es requerido"

### Celular
- [ ] "Celular es requerido"
- [ ] "El celular debe tener 9 digitos"
- [ ] "El celular debe empezar con 9"

### DNI
- [ ] "DNI es requerido"
- [ ] "DNI debe ser 8 digitos"

### Nombres
- [ ] "Nombres es requerido"
- [ ] "Apellido Paterno es requerido"
- [ ] "Apellido Materno es requerido"

### RUC (Persona Juridica)
- [ ] "RUC es requerido"
- [ ] "RUC debe ser 11 digitos (empezando con 10 o 20)"

### Direccion
- [ ] "Direccion declarada es requerida (minimo 10 caracteres)"

---

## Performance Testing

### Tiempo de Respuesta
- [ ] Aparicion del banner: < 300ms
- [ ] Scroll al campo: < 500ms
- [ ] Limpieza de error: < 100ms (instantaneo)
- [ ] Focus en campo: < 100ms

### Smoothness
- [ ] Scroll es suave (60fps)
- [ ] Animaciones sin lag
- [ ] Tipeo responsive sin delay

---

## Accesibilidad (A11y)

### Contraste
- [ ] Banner rojo: Contraste suficiente (WCAG AA)
- [ ] Banner amarillo: Contraste suficiente
- [ ] Banner naranja: Contraste suficiente
- [ ] Banner azul: Contraste suficiente
- [ ] Texto negro sobre fondo blanco: Contraste suficiente

### Navegacion por Teclado
- [ ] Tab navega entre campos correctamente
- [ ] Focus visible en campos con error
- [ ] Enter en "Ir al primer campo" funciona
- [ ] Escape cierra banners (opcional)

### Screen Readers
- [ ] Mensajes de error son leidos
- [ ] Labels de campos son claros
- [ ] Botones tienen texto descriptivo

---

## Bugs Comunes a Verificar

### Layout
- [ ] Banner no causa layout shift
- [ ] Lista de errores no genera scroll horizontal
- [ ] Botones no se superponen con contenido

### Logica
- [ ] Contador de errores es correcto
- [ ] Errores duplicados no aparecen
- [ ] Errores viejos se limpian correctamente

### UX
- [ ] Usuario no pierde datos al corregir errores
- [ ] Scroll no interrumpe el tipeo
- [ ] Focus no salta entre campos inesperadamente

---

## Reportar Issues

### Template de Issue
```markdown
**Escenario:** [Numero de escenario]
**Navegador:** Chrome 130 / Firefox 120 / Safari 17
**Dispositivo:** Desktop / Laptop / Tablet / Mobile
**Resolucion:** 1920x1080

**Pasos para Reproducir:**
1. ...
2. ...
3. ...

**Resultado Esperado:**
...

**Resultado Actual:**
...

**Screenshot:**
[Adjuntar captura]

**Severidad:**
- [ ] Critico (bloquea testing)
- [ ] Alto (funcionalidad rota)
- [ ] Medio (UX deteriorada)
- [ ] Bajo (mejora estetica)
```

---

## Criterios de Aprobacion

### Must Have (Criticos)
- [x] Errores de validacion se muestran
- [x] Mensajes son especificos
- [x] Scroll automatico funciona
- [x] Correccion en tiempo real funciona
- [x] No hay errores de consola

### Should Have (Importantes)
- [ ] Responsive en mobile
- [ ] Animaciones suaves
- [ ] Colores diferenciados por tipo

### Nice to Have (Opcionales)
- [ ] Tests E2E automatizados
- [ ] Analytics de errores frecuentes
- [ ] A/B testing de mensajes

---

**Creado:** 13 Enero 2026
**Version:** 1.0
**Tiempo Estimado:** 30 minutos testing manual
