# Testing OCR Validation Alert - Guía de Pruebas

## Objetivo
Validar la funcionalidad de validación inteligente OCR que compara datos del formulario vs DNI.

## Pre-requisitos
- Servidor corriendo en puerto 3000
- Usuario con rol Admin/Jefe Ventas/Vendedor
- Acceso al proyecto PRUEBAS
- Imágenes de test en `docs/test-assets/dni/`

## Escenario 1: Sin Discrepancias (Caso ideal)

### Pasos:
1. Ir a http://localhost:3000/locales
2. Filtrar por proyecto PRUEBAS
3. Buscar un local en estado DISPONIBLE
4. Hacer clic en "Abrir Ficha"
5. En la sección "DNI Titular":
   - Subir `docs/test-assets/dni/dni-sintetico-01-frente.png`
   - Subir `docs/test-assets/dni/dni-sintetico-01-reverso.png`
6. Esperar extracción OCR (spinner → checkmark verde)
7. Datos se autocompletarán en el formulario

### Resultado esperado:
- ✅ NO debe mostrarse ninguna alerta de validación
- ✅ Campos autocompletados correctamente
- ✅ Sin banner amarillo de discrepancia

---

## Escenario 2: Con Discrepancias (Prueba de validación)

### Pasos:
1. Repetir pasos 1-7 del Escenario 1
2. **Modificar manualmente** los siguientes campos:
   - Nombres: Cambiar "JUAN CARLOS" → "JUAN"
   - Apellido Paterno: Cambiar "GARCIA" → "GARCIA MENDOZA"
   - Dirección: Borrar completamente (dejar vacío)
3. Hacer scroll hasta la sección "Datos del Titular"

### Resultado esperado:
- ✅ Aparece banner amarillo con el texto:
  ```
  ⚠️ Discrepancia detectada entre formulario y DNI
  3 campos difieren de los datos OCR
  ```
- ✅ Banner tiene botones de expandir/contraer y cerrar
- ✅ Tabla muestra:
  | Campo | Formulario | DNI (OCR) | Acción |
  |-------|-----------|-----------|---------|
  | Nombres | JUAN | JUAN CARLOS | [Usar] |
  | Apellido Paterno | GARCIA MENDOZA | GARCIA | [Usar] |
  | Dirección | (vacío) | AV. LOS HEROES 123 | [Usar] |

---

## Escenario 3: Aplicar Corrección Individual

### Pasos:
1. Desde el Escenario 2, hacer clic en "Usar" en el campo "Nombres"
2. Observar cambios

### Resultado esperado:
- ✅ Campo "Nombres" se actualiza a "JUAN CARLOS"
- ✅ Botón cambia a "✓ Aplicado" (verde)
- ✅ La fila queda marcada como aplicada
- ✅ Contador de discrepancias baja de 3 a 2

---

## Escenario 4: Aplicar Todas las Correcciones

### Pasos:
1. Desde el Escenario 2, hacer clic en "Usar todos los datos del DNI"
2. Observar cambios

### Resultado esperado:
- ✅ Todos los campos se actualizan con datos OCR
- ✅ Todos los botones muestran "✓ Aplicado"
- ✅ Banner desaparece (ya no hay discrepancias)

---

## Escenario 5: Ignorar Alerta

### Pasos:
1. Desde el Escenario 2, hacer clic en la "X" del banner
2. Observar

### Resultado esperado:
- ✅ Banner desaparece
- ✅ Campos del formulario mantienen sus valores modificados
- ✅ No vuelve a aparecer hasta recargar la ficha

---

## Escenario 6: Con Cónyuge (Multi-persona)

### Pasos:
1. Abrir nueva ficha
2. Subir DNI Titular (dni-sintetico-01)
3. Marcar checkbox "¿Tiene cónyuge?"
4. Subir DNI Cónyuge (dni-sintetico-02)
5. Modificar manualmente campo "Cónyuge - Nombres"
6. Hacer scroll a "Datos del Cónyuge"

### Resultado esperado:
- ✅ Banner muestra dos secciones:
  - Titular (si hay discrepancias)
  - Cónyuge (con discrepancias)
- ✅ Cada sección tiene su botón "Usar todos los datos del DNI"
- ✅ Botones "Usar" funcionan independientemente

---

## Escenario 7: Normalización Inteligente (No alerta)

### Pasos:
1. Abrir ficha y subir DNI
2. Modificar manualmente:
   - OCR dice: "MARÍA JOSÉ"
   - Usuario escribe: "maria jose" (minúsculas, sin acentos)
3. Observar

### Resultado esperado:
- ✅ NO debe aparecer alerta
- ✅ El sistema reconoce que son el mismo valor normalizado
- ✅ Esto demuestra la inteligencia de comparación

---

## Escenario 8: Campo Faltante (Alerta necesaria)

### Pasos:
1. Abrir ficha y subir DNI
2. OCR extrae: "AV. LOS HEROES 123"
3. Campo "Dirección" del formulario: vacío
4. Observar

### Resultado esperado:
- ✅ SÍ debe aparecer alerta
- ✅ Muestra: Formulario = "(vacío)" | DNI = "AV. LOS HEROES 123"
- ✅ Esto ayuda a completar campos faltantes

---

## Escenario 9: OCR sin Datos (No alerta)

### Pasos:
1. Abrir ficha
2. Subir DNI borroso o con error (dni-frente-07-error.png)
3. OCR no extrae algunos campos
4. Usuario completa manualmente
5. Observar

### Resultado esperado:
- ✅ NO debe aparecer alerta si OCR no tiene datos
- ✅ Principio: "Falta de datos OCR != Error del usuario"

---

## Escenario 10: Copropietario (3+ personas)

### Pasos:
1. Abrir ficha
2. Agregar 2 copropietarios
3. Subir DNI para:
   - Titular (dni-sintetico-01)
   - Copropietario 1 (dni-sintetico-03)
   - Copropietario 2 (dni-sintetico-04)
4. Modificar datos de Copropietario 1
5. Hacer scroll

### Resultado esperado:
- ✅ Banner muestra:
  - Titular (si hay discrepancias)
  - Copropietario 1 (con discrepancias)
  - Copropietario 2 (si hay discrepancias)
- ✅ Cada sección independiente
- ✅ Botones funcionan correctamente

---

## Checklist de UX

### Diseño Visual:
- [ ] Banner amarillo (#fbde17) con borde left amarillo
- [ ] Icono de alerta (AlertCircle) visible
- [ ] Texto legible y profesional
- [ ] Botones con colores corporativos (#1b967a)
- [ ] Estado "Aplicado" en verde con checkmark

### Interactividad:
- [ ] Botón expandir/contraer funciona
- [ ] Botón cerrar (X) oculta alerta
- [ ] Botón "Usar" actualiza campo inmediatamente
- [ ] Botón "Usar todos" actualiza todos a la vez
- [ ] Animaciones suaves (transitions)

### Responsive:
- [ ] Se ve bien en desktop (1920px)
- [ ] Se ve bien en tablet (768px)
- [ ] Tabla scroll horizontal en móvil si es necesario

### Performance:
- [ ] No lag al expandir/contraer
- [ ] Actualización instantánea al aplicar datos
- [ ] Hook useMemo optimiza recálculos

---

## Casos Edge

### 1. DNI con caracteres especiales
- OCR: "O'CONNOR"
- Usuario: "OCONNOR"
- ¿Debe alertar? → SÍ (son diferentes)

### 2. Espacios múltiples
- OCR: "GARCIA    LOPEZ"
- Usuario: "GARCIA LOPEZ"
- ¿Debe alertar? → NO (normalización)

### 3. Ñ y acentos
- OCR: "PEÑA MUÑOZ"
- Usuario: "PENA MUNOZ"
- ¿Debe alertar? → NO (normalización)

### 4. Mayúsculas vs minúsculas
- OCR: "MARIA"
- Usuario: "maria"
- ¿Debe alertar? → NO (normalización)

---

## Debugging

### Si no aparece la alerta:
1. Abrir DevTools Console
2. Buscar errores relacionados con `useOCRValidation`
3. Verificar que `dniPairs` tenga datos OCR
4. Verificar que `formData` tenga datos diferentes

### Si aparece cuando no debería:
1. Revisar función `normalizeString()`
2. Verificar que los datos se estén normalizando correctamente
3. Agregar console.log en `isDifferent()`

### Si el botón "Usar" no funciona:
1. Verificar `handleApplyOCRData()` en consola
2. Revisar que `setFormData` se esté llamando
3. Para copropietarios, verificar parsing de `fieldKey`

---

## Archivos de Test Recomendados

| Persona | Frente | Reverso |
|---------|--------|---------|
| Titular | dni-sintetico-01-frente.png | dni-sintetico-01-reverso.png |
| Cónyuge | dni-sintetico-02-frente.png | dni-sintetico-02-reverso.png |
| Coprop 1 | dni-sintetico-03-frente.png | dni-sintetico-03-reverso.png |
| Coprop 2 | dni-sintetico-04-frente.png | dni-sintetico-04-reverso.png |

---

## Criterios de Éxito

✅ **PASA** si:
- Detecta discrepancias reales
- No alerta por diferencias insignificantes (acentos, mayúsculas, espacios)
- Botones "Usar" actualizan correctamente
- UX es fluido y profesional
- Funciona con múltiples personas (titular + cónyuge + copropietarios)

❌ **FALLA** si:
- Alerta por diferencias normalizables
- No detecta discrepancias reales
- Botones no funcionan
- UI se rompe o es confusa
- Performance degradada

---

**Fecha:** 4 Enero 2026
**Tester:** Frontend Developer Agent
**Versión:** 1.0
