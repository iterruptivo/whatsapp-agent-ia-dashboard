# Validación Manual - Combobox Filtro Usuarios

## Checklist de Validación

### Setup
- [ ] Servidor corriendo en `http://localhost:3000`
- [ ] Login como superadmin: `gerente.ti@ecoplaza.com.pe` / `H#TJf8M%xjpTK@Vn`
- [ ] Navegar a `/reuniones`

### Funcionalidad Básica

#### 1. Visualización del Componente
- [ ] Se muestra el label "Ver reuniones de"
- [ ] Se muestra un botón con texto (ej: "Mis reuniones")
- [ ] El botón tiene un icono de chevron (⌄) a la derecha
- [ ] El botón tiene estilos consistentes con el resto del dashboard

#### 2. Apertura del Dropdown
- [ ] Al hacer click en el botón, se abre un dropdown
- [ ] El dropdown tiene un input de búsqueda arriba
- [ ] El input tiene placeholder "Buscar usuario..."
- [ ] El input tiene un icono de búsqueda (🔍)
- [ ] Se ven las opciones "★ Mis reuniones" y "★ Todas"
- [ ] Hay un separador y un label "USUARIOS"
- [ ] Se ven usuarios en la lista (si hay)

#### 3. Funcionalidad de Búsqueda
- [ ] Al escribir en el input, filtra usuarios
- [ ] Busca por nombre (ej: "leo" encuentra "Leonardo")
- [ ] Busca por email (ej: "ecoplaza" encuentra usuarios con ese email)
- [ ] Las opciones fijas ("Mis reuniones", "Todas") siempre están visibles
- [ ] Muestra "No se encontraron usuarios" si no hay coincidencias
- [ ] Limita a 7 usuarios máximo

#### 4. Selección de Opciones
- [ ] Al hacer click en "Mis reuniones", se cierra el dropdown
- [ ] El botón muestra "Mis reuniones"
- [ ] La tabla de reuniones se filtra correctamente
- [ ] Al hacer click en "Todas", se cierra el dropdown
- [ ] El botón muestra "Todas"
- [ ] La tabla muestra todas las reuniones
- [ ] Al seleccionar un usuario, se cierra el dropdown
- [ ] El botón muestra el nombre del usuario
- [ ] La tabla muestra solo reuniones de ese usuario

#### 5. Indicador Visual de Selección
- [ ] La opción seleccionada tiene un check verde (✓)
- [ ] El check se muestra solo en la opción activa
- [ ] El check es del color corporativo (#1b967a)

#### 6. Cierre del Dropdown
- [ ] Al hacer click fuera del dropdown, se cierra
- [ ] Al seleccionar una opción, se cierra automáticamente
- [ ] El input de búsqueda se limpia al cerrar

### UX y Estilos

#### 7. Hover Effects
- [ ] Al pasar el mouse sobre una opción, cambia el fondo a gris claro
- [ ] El cursor cambia a pointer en las opciones
- [ ] Los estilos son consistentes con el diseño del dashboard

#### 8. Estados Disabled
- [ ] Si `loading={true}`, el botón está deshabilitado
- [ ] El cursor cambia a not-allowed cuando está disabled
- [ ] El fondo es gris (#disabled:bg-gray-100)

#### 9. Colores Corporativos
- [ ] Label: Azul navy (#192c4d)
- [ ] Focus ring: Verde (#1b967a)
- [ ] Check icon: Verde (#1b967a)
- [ ] Estrellas: Amarillo (#fbde17 o similar)

### Responsive

#### 10. Desktop (1920px)
- [ ] El dropdown se abre sin problemas
- [ ] El ancho es apropiado (full width del botón)
- [ ] No rompe el layout del grid de filtros

#### 11. Tablet (768px)
- [ ] El componente es funcional
- [ ] El dropdown se adapta al ancho disponible
- [ ] No hay scroll horizontal

#### 12. Mobile (375px)
- [ ] El botón es táctil y fácil de presionar
- [ ] El dropdown se abre correctamente
- [ ] El input de búsqueda es usable en mobile
- [ ] Las opciones son fáciles de seleccionar con el dedo

### Teclado (Accesibilidad)

#### 13. Navegación con Teclado
- [ ] Tab enfoca el botón
- [ ] Enter/Space abre el dropdown
- [ ] Flecha Arriba/Abajo navega entre opciones
- [ ] Enter selecciona la opción enfocada
- [ ] Escape cierra el dropdown
- [ ] Se puede escribir en el input con foco

### Performance

#### 14. Rendimiento
- [ ] El dropdown abre sin lag (<100ms)
- [ ] El filtrado es instantáneo (<50ms)
- [ ] No hay errores en la consola del navegador
- [ ] No hay warnings de React en la consola

### Integración

#### 15. Integración con Tabla
- [ ] Al seleccionar "Mis reuniones", la tabla se actualiza
- [ ] Al seleccionar "Todas", la tabla muestra todas
- [ ] Al seleccionar un usuario, la tabla muestra solo sus reuniones
- [ ] El contador de reuniones es correcto
- [ ] La paginación funciona correctamente

---

## Ejecución de Tests Automatizados

### Playwright (Opcional)

```bash
# Correr todos los tests del combobox
npx playwright test tests/reuniones-combobox-manual.spec.ts

# Con UI
npx playwright test tests/reuniones-combobox-manual.spec.ts --ui

# Solo un test específico
npx playwright test tests/reuniones-combobox-manual.spec.ts -g "Debe mostrar el botón del combobox"

# Generar screenshots
npx playwright test tests/reuniones-combobox-manual.spec.ts --screenshot=on
```

---

## Screenshots Esperados

### 1. Botón Cerrado
```
[Ver reuniones de]
┌─────────────────────────────┐
│ Mis reuniones           ⌄  │
└─────────────────────────────┘
```

### 2. Dropdown Abierto
```
┌─────────────────────────────┐
│ Mis reuniones           ⌄  │
└─────────────────────────────┘
┌─────────────────────────────┐
│ 🔍 Buscar usuario...       │
├─────────────────────────────┤
│ ★ Mis reuniones         ✓ │
│ ★ Todas                   │
├─────────────────────────────┤
│ USUARIOS                    │
│ Leonardo Caseta            │
│   leocaseta@ecoplaza.com   │
│ Leo Jefe Ventas            │
│   leojefeventas@ecoplaza   │
└─────────────────────────────┘
```

### 3. Con Búsqueda
```
┌─────────────────────────────┐
│ 🔍 leo                     │  ← Usuario escribió "leo"
├─────────────────────────────┤
│ ★ Mis reuniones            │
│ ★ Todas                    │
├─────────────────────────────┤
│ USUARIOS                    │
│ Leonardo Caseta            │  ← Solo usuarios que coinciden
│   leocaseta@ecoplaza.com   │
│ Leo Jefe Ventas            │
│   leojefeventas@ecoplaza   │
└─────────────────────────────┘
```

---

## Reporte de Bugs

Si encuentras algún problema, documéntalo aquí:

### Bug Template
```
**Descripción:** [Qué pasó]
**Pasos para reproducir:**
1. ...
2. ...
3. ...
**Resultado esperado:** [Qué debería pasar]
**Resultado actual:** [Qué pasó]
**Screenshot:** [Si aplica]
**Navegador:** [Chrome/Firefox/Safari]
**Viewport:** [Desktop/Tablet/Mobile]
```

---

**Última actualización:** 2026-01-15
**Estado:** Pendiente validación
