# Testing Manual - UI de Administración de Roles

**Fecha:** 12 Enero 2026
**Módulo:** Admin - Gestión de Roles
**Usuario de Prueba:** gerencia@ecoplaza.com (superadmin)

---

## Checklist de Validación

### 1. Página de Roles (`/admin/roles`)

- [ ] La página carga sin errores
- [ ] Se muestra el header con icono de Shield
- [ ] Se muestra el contador de roles
- [ ] Botón "Crear Rol" está visible y con estilo correcto
- [ ] Tabla de roles muestra todos los roles
- [ ] Roles de sistema tienen badge "Sistema"
- [ ] Estados (Activo/Inactivo) se muestran correctamente
- [ ] Contadores de permisos y usuarios funcionan
- [ ] Botones de acciones (Ver, Editar, Eliminar) funcionan

### 2. Modal de Crear Rol

**Abrir Modal:**
- [ ] Hacer clic en "Crear Rol"
- [ ] Modal se abre con animación
- [ ] Backdrop oscurece el fondo
- [ ] Hacer clic en backdrop cierra el modal

**Validación de Formulario:**
- [ ] Campo "Nombre" es requerido (*)
- [ ] Intentar enviar sin nombre → muestra error
- [ ] Nombre < 3 caracteres → muestra error
- [ ] Contador de caracteres funciona (0/50)
- [ ] Campo "Descripción" es opcional
- [ ] Contador de descripción funciona (0/200)

**Crear Rol Exitoso:**
- [ ] Ingresar nombre: "Coordinador de Marketing"
- [ ] Ingresar descripción: "Gestiona campañas de marketing digital"
- [ ] Hacer clic en "Crear Rol"
- [ ] Botón muestra "Creando..." con spinner
- [ ] Redirige a `/admin/roles/[id]` del nuevo rol
- [ ] Modal se cierra

**Casos de Error:**
- [ ] Nombre duplicado → muestra error
- [ ] Error de red → muestra error genérico

### 3. Detalle de Rol - Permisos Editables (`/admin/roles/[id]`)

**Navegación:**
- [ ] Desde la tabla, hacer clic en "Ver" (icono ojo)
- [ ] Página carga correctamente
- [ ] Header muestra nombre del rol
- [ ] Metadata (badges de sistema, activo, usuarios) visible

**Matriz de Permisos:**
- [ ] Matriz se carga con permisos actuales
- [ ] Módulos están agrupados y plegables
- [ ] Contador de permisos (X / Y permisos) correcto
- [ ] Buscador de permisos funciona

**Editar Permisos:**
- [ ] Hacer clic en checkbox de módulo (toggle todos)
- [ ] Todos los permisos del módulo se activan
- [ ] Badge del módulo cambia a verde
- [ ] Hacer clic nuevamente → todos se desactivan

- [ ] Expandir módulo "Leads"
- [ ] Hacer clic en permiso individual "read"
- [ ] Checkbox se marca/desmarca
- [ ] Contador se actualiza

- [ ] Activar algunos permisos
- [ ] Aparece alerta amarilla "Tienes cambios sin guardar"
- [ ] Aparece botón "Guardar Cambios" (arriba y abajo)

**Guardar Cambios:**
- [ ] Hacer clic en "Guardar Cambios"
- [ ] Botón muestra "Guardando..." con spinner
- [ ] Aparece toast verde de éxito
- [ ] Página se recarga automáticamente (1.5s)
- [ ] Cambios persisten después de recargar

**Búsqueda de Permisos:**
- [ ] Escribir "lead" en buscador
- [ ] Solo módulo "Leads" se muestra
- [ ] Escribir "exportar"
- [ ] Módulos con permiso "exportar" se muestran
- [ ] Limpiar búsqueda → todos los módulos vuelven

### 4. Responsive Design

**Desktop (1920x1080):**
- [ ] Layout se ve correcto
- [ ] Matriz de permisos: 3 columnas

**Tablet (768px):**
- [ ] Modal se adapta bien
- [ ] Tabla responsive (scroll horizontal si necesario)
- [ ] Matriz de permisos: 2 columnas

**Mobile (375px):**
- [ ] Modal ocupa casi toda la pantalla
- [ ] Botones son táctiles (mínimo 44px)
- [ ] Matriz de permisos: 1 columna

### 5. Acceso Restringido

- [ ] Intentar acceder como usuario NO superadmin
- [ ] Debe redirigir a `/` (home)
- [ ] Sin acceso a `/admin/roles`

### 6. Roles de Sistema

- [ ] Seleccionar rol "admin" (es_sistema = true)
- [ ] Badge "Rol de Sistema" visible
- [ ] Nota azul: "no puedes eliminarlo"
- [ ] En la tabla, botón "Eliminar" NO aparece
- [ ] Permisos SÍ son editables

### 7. Eliminar Rol Personalizado

**Crear y Eliminar:**
- [ ] Crear rol "Test Temporal"
- [ ] Volver a `/admin/roles`
- [ ] Hacer clic en "Eliminar" (icono basura)
- [ ] Aparece modal de confirmación
- [ ] Mensaje claro: "¿Eliminar rol Test Temporal?"
- [ ] Hacer clic en "Eliminar"
- [ ] Rol desaparece de la tabla
- [ ] Toast de éxito

**Rol con Usuarios Asignados:**
- [ ] Crear rol "Coordinador Test"
- [ ] Asignar a un usuario (desde módulo Usuarios)
- [ ] Intentar eliminar
- [ ] Error: "No se puede eliminar, tiene N usuario(s)"

### 8. Navegación

- [ ] Link "Volver a Roles" en detalle funciona
- [ ] Breadcrumbs o navegación clara
- [ ] Botón "Crear Rol" siempre accesible

### 9. Colores Corporativos

- [ ] Verde primario #1b967a en botones principales
- [ ] Azul navy #192c4d en títulos
- [ ] Hover states funcionan correctamente

### 10. Consola del Browser

- [ ] Abrir DevTools (F12)
- [ ] Tab "Console"
- [ ] NO debe haber errores en rojo
- [ ] Advertencias (warnings) aceptables

---

## Escenarios de Testing

### Escenario 1: Crear Rol desde Cero

1. Login como superadmin
2. Ir a `/admin/roles`
3. Clic en "Crear Rol"
4. Nombre: "Supervisor de Caseta"
5. Descripción: "Encargado de supervisar operaciones en caseta de ventas"
6. Crear
7. En la página de detalle, activar permisos:
   - Leads: read, read_all
   - Locales: read
   - Ventas: read
8. Guardar cambios
9. Volver a `/admin/roles`
10. Verificar que el nuevo rol aparece en la tabla

### Escenario 2: Modificar Permisos de Rol Existente

1. Seleccionar rol "vendedor"
2. Verificar permisos actuales
3. Agregar permiso: `leads:export`
4. Remover permiso: `leads:delete`
5. Guardar cambios
6. Recargar página manualmente
7. Verificar que cambios persisten

### Escenario 3: Clonar Permisos (Manual)

1. Ver permisos de rol "jefe_ventas"
2. Crear nuevo rol "Jefe Ventas Junior"
3. Activar los mismos permisos manualmente
4. Remover algunos permisos sensibles (ej: `usuarios:delete`)
5. Guardar

---

## Bugs Conocidos / Limitaciones

- [ ] No hay función de "Clonar Rol" (feature futura)
- [ ] No hay histórico de cambios en permisos (audit log)
- [ ] No hay confirmación al salir con cambios sin guardar

---

## Criterios de Aceptación

- Todas las casillas del checklist marcadas ✅
- Sin errores en consola del navegador
- Responsive funciona en 3 breakpoints
- Permisos persisten después de guardar
- Modal es accesible (ESC cierra, Tab navega)

---

## Notas de Testing

**Fecha:** ____________
**Tester:** ____________

**Issues Encontrados:**

1. _______________________________________________________
2. _______________________________________________________
3. _______________________________________________________

**Comentarios:**

_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
