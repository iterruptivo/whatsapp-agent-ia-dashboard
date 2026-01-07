# Checklist de Validación Visual - OCR Validation Alert

## Pre-requisitos
- [ ] Servidor corriendo en http://localhost:3000
- [ ] Usuario autenticado (Admin/Jefe Ventas/Vendedor)
- [ ] Proyecto PRUEBAS seleccionado

---

## Paso 1: Navegación Básica
```
URL: http://localhost:3000/locales
```

- [ ] La página carga sin errores
- [ ] Tabla de locales visible
- [ ] Filtros funcionando

---

## Paso 2: Abrir Ficha de Inscripción

- [ ] Buscar local en estado DISPONIBLE
- [ ] Hacer clic en "Abrir Ficha"
- [ ] Modal se abre correctamente
- [ ] Header verde (#1b967a) visible
- [ ] Secciones del formulario visibles

---

## Paso 3: Subir DNI del Titular

### Archivos a usar:
```
Frente: docs/test-assets/dni/dni-sintetico-01-frente.png
Reverso: docs/test-assets/dni/dni-sintetico-01-reverso.png
```

### Acciones:
- [ ] Ir a sección "DNI Titular"
- [ ] Hacer clic en "Subir Frente"
- [ ] Seleccionar dni-sintetico-01-frente.png
- [ ] Esperar spinner → checkmark verde
- [ ] Hacer clic en "Subir Reverso"
- [ ] Seleccionar dni-sintetico-01-reverso.png
- [ ] Esperar spinner → checkmark verde

### Validación:
- [ ] Campos se autocompletaron:
  - [ ] Nombres
  - [ ] Apellido Paterno
  - [ ] Apellido Materno
  - [ ] Número Documento
  - [ ] Dirección
  - [ ] Distrito
  - [ ] Provincia
  - [ ] Departamento

---

## Paso 4: Crear Discrepancias Manualmente

### Modificar campos:
1. **Nombres:**
   - Valor actual: "JUAN CARLOS"
   - Cambiar a: "JUAN"
   - [ ] Campo modificado

2. **Apellido Paterno:**
   - Valor actual: "GARCIA"
   - Cambiar a: "GARCIA MENDOZA"
   - [ ] Campo modificado

3. **Dirección:**
   - Valor actual: "AV. LOS HEROES 123"
   - Borrar completamente (dejar vacío)
   - [ ] Campo vacío

---

## Paso 5: Verificar Alerta de Validación

### Hacer scroll hasta "Datos del Titular"

### Debe aparecer banner amarillo:
- [ ] Background: amarillo claro (#fbde17)
- [ ] Border left: amarillo oscuro
- [ ] Icono de alerta (⚠️) visible
- [ ] Texto: "Discrepancia detectada entre formulario y DNI"
- [ ] Contador: "3 campos difieren de los datos OCR"
- [ ] Botón expandir/contraer (chevron) visible
- [ ] Botón cerrar (X) visible

---

## Paso 6: Expandir Alerta

- [ ] Hacer clic en botón chevron
- [ ] Banner se expande suavemente (animación)
- [ ] Tabla comparativa visible

### Verificar contenido de tabla:

#### Header:
- [ ] Columna 1: "Campo"
- [ ] Columna 2: "Formulario"
- [ ] Columna 3: "DNI (OCR)"
- [ ] Columna 4: "Acción"

#### Fila 1: Nombres
- [ ] Campo: "Nombres"
- [ ] Formulario: "JUAN"
- [ ] DNI: "JUAN CARLOS" (en verde #1b967a)
- [ ] Botón: "Usar"

#### Fila 2: Apellido Paterno
- [ ] Campo: "Apellido Paterno"
- [ ] Formulario: "GARCIA MENDOZA"
- [ ] DNI: "GARCIA" (en verde #1b967a)
- [ ] Botón: "Usar"

#### Fila 3: Dirección
- [ ] Campo: "Dirección"
- [ ] Formulario: "(vacío)" en gris italic
- [ ] DNI: "AV. LOS HEROES 123" (en verde #1b967a)
- [ ] Botón: "Usar"

#### Sección Titular:
- [ ] Título: "Titular" visible
- [ ] Botón: "Usar todos los datos del DNI" visible (verde #1b967a)

#### Footer:
- [ ] Nota: "Los datos del DNI fueron extraídos por OCR..." visible

---

## Paso 7: Aplicar Corrección Individual

### Hacer clic en "Usar" en fila "Nombres"

- [ ] Botón cambia a "✓ Aplicado" (verde)
- [ ] Campo "Nombres" del formulario se actualiza a "JUAN CARLOS"
- [ ] Fila queda marcada visualmente
- [ ] Las otras filas permanecen sin cambios

---

## Paso 8: Aplicar Todas las Correcciones

### Hacer clic en "Usar todos los datos del DNI"

- [ ] Todos los campos se actualizan:
  - [ ] Apellido Paterno: "GARCIA"
  - [ ] Dirección: "AV. LOS HEROES 123"
- [ ] Todos los botones cambian a "✓ Aplicado"
- [ ] Banner desaparece (ya no hay discrepancias)

---

## Paso 9: Cerrar Alerta (Ignorar)

### Recrear discrepancias (repetir Paso 4)
### Hacer clic en botón "X"

- [ ] Banner desaparece
- [ ] Campos mantienen valores modificados
- [ ] Alerta no reaparece hasta recargar ficha

---

## Paso 10: Contraer/Expandir

### Recrear discrepancias
### Hacer clic en chevron para contraer

- [ ] Tabla se oculta suavemente
- [ ] Solo header del banner visible
- [ ] Chevron apunta hacia abajo

### Hacer clic en chevron para expandir

- [ ] Tabla se muestra suavemente
- [ ] Chevron apunta hacia arriba

---

## Paso 11: Validación con Cónyuge

### Marcar checkbox "¿Tiene cónyuge?"
- [ ] Sección "DNI Cónyuge" aparece
- [ ] Sección "Datos del Cónyuge" aparece

### Subir DNI del Cónyuge:
```
Frente: docs/test-assets/dni/dni-sintetico-02-frente.png
Reverso: docs/test-assets/dni/dni-sintetico-02-reverso.png
```

- [ ] Campos de cónyuge se autocompletar
- [ ] Sin alerta (datos consistentes)

### Modificar "Cónyuge - Nombres"
- [ ] Cambiar valor manualmente
- [ ] Hacer scroll a "Datos del Cónyuge"
- [ ] Banner aparece con sección "Cónyuge"
- [ ] Tabla muestra discrepancia del cónyuge
- [ ] Botón "Usar" funciona para cónyuge

---

## Paso 12: Normalización Inteligente (No debe alertar)

### Caso 1: Acentos
- OCR: "MARÍA JOSÉ"
- Usuario escribe: "MARIA JOSE"
- [ ] NO aparece alerta (normalización correcta)

### Caso 2: Mayúsculas/Minúsculas
- OCR: "GARCIA"
- Usuario escribe: "garcia"
- [ ] NO aparece alerta (normalización correcta)

### Caso 3: Espacios múltiples
- OCR: "GARCIA LOPEZ"
- Usuario escribe: "GARCIA    LOPEZ"
- [ ] NO aparece alerta (normalización correcta)

---

## Paso 13: Responsive Design

### Desktop (1920px)
- [ ] Banner ocupa ancho completo de la sección
- [ ] Tabla legible sin scroll horizontal
- [ ] Botones bien espaciados

### Tablet (768px)
- [ ] Banner responsive
- [ ] Tabla con scroll horizontal si es necesario
- [ ] Botones accesibles

### Mobile (375px)
- [ ] Banner visible
- [ ] Tabla scroll horizontal
- [ ] Botones táctiles (mínimo 44px)

---

## Paso 14: DevTools Console

### Abrir DevTools (F12)
### Ir a tab "Console"

- [ ] Sin errores rojos
- [ ] Sin warnings relacionados con OCRValidationAlert
- [ ] Sin warnings relacionados con useOCRValidation

---

## Paso 15: Performance

### Modificar campo del formulario varias veces

- [ ] Alerta se actualiza instantáneamente
- [ ] Sin lag o delay
- [ ] Animaciones fluidas (60fps)

### Expandir/Contraer múltiples veces

- [ ] Transiciones suaves
- [ ] Sin parpadeos
- [ ] Sin re-renders innecesarios

---

## Criterios de Aprobación

### PASA si:
- ✅ Todos los checkboxes están marcados
- ✅ Sin errores en consola
- ✅ UX fluida y profesional
- ✅ Funciona con titular, cónyuge y copropietarios
- ✅ Normalización funciona correctamente

### FALLA si:
- ❌ Errores en consola
- ❌ Alerta no aparece cuando debería
- ❌ Alerta aparece cuando no debería (falsos positivos)
- ❌ Botones "Usar" no funcionan
- ❌ UI rota o confusa
- ❌ Performance degradada

---

## Screenshots Recomendados

Tomar capturas de pantalla de:
1. Banner contraído (estado inicial)
2. Banner expandido con tabla completa
3. Botón "Aplicado" en verde
4. Banner con múltiples personas (Titular + Cónyuge)
5. Responsive en mobile

---

## Notas Finales

- Este checklist debe completarse en una sola sesión
- Usar siempre proyecto PRUEBAS
- No modificar datos de producción
- Si encuentras bugs, documentar en GitHub Issues

---

**Fecha:** 4 Enero 2026
**Versión:** 1.0
**Tiempo estimado:** 30-45 minutos
