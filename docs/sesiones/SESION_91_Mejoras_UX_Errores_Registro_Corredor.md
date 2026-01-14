# Sesion 91 - Mejoras UX/UI en Manejo de Errores - Registro Corredor

**Fecha:** 13 Enero 2026
**Archivo:** `app/expansion/registro/RegistroCorredorClient.tsx`
**Objetivo:** Mejorar experiencia de usuario al mostrar errores especificos y claros

---

## Problema Identificado

**Antes:**
- Error generico: "Error enviando registro - Por favor, revisa los datos e intenta nuevamente"
- Usuario no sabia que campo especifico tenia error
- No se diferenciaba entre tipos de errores (validacion, sesion, red, permisos)
- Sin scroll automatico a campos con error

---

## Mejoras Implementadas

### 1. Sistema de Deteccion de Tipos de Error

Se implemento la funcion `getErrorType()` que clasifica errores en:

| Tipo | Descripcion | Keywords |
|------|-------------|----------|
| `validation` | Campos incompletos/invalidos | N/A (interno) |
| `session` | Sesion expirada | token, sesion, autenticacion |
| `permission` | Permisos insuficientes | permiso, autorizado, RLS |
| `network` | Problemas de conexion | red, network, timeout |
| `unknown` | Error generico | Cualquier otro |

### 2. UI Diferenciada por Tipo de Error

#### Error de Validacion
```
┌────────────────────────────────────────────┐
│ 🔴 Completa los siguientes campos          │
├────────────────────────────────────────────┤
│ Hay 3 campo(s) que necesitan tu atencion   │
│                                            │
│ ╔════════════════════════════════════════╗ │
│ ║ × DNI debe tener 8 digitos             ║ │
│ ║ × Celular debe tener 9 digitos         ║ │
│ ║ × Falta subir DNI Reverso              ║ │
│ ╚════════════════════════════════════════╝ │
│                                            │
│                      [Ir al primer campo]  │
└────────────────────────────────────────────┘
```

**Caracteristicas:**
- Color: Rojo/Naranja degradado
- Lista detallada de todos los errores
- Boton "Ir al primer campo" con scroll automatico
- Campos con error resaltados en rojo

#### Error de Sesion Expirada
```
┌────────────────────────────────────────────┐
│ 🟡 Sesion Expirada                         │
├────────────────────────────────────────────┤
│ Tu sesion ha expirado por seguridad.       │
│ Por favor, inicia sesion nuevamente        │
│ para continuar con tu registro.            │
├────────────────────────────────────────────┤
│    [👤 Iniciar Sesion]   [Cerrar]          │
└────────────────────────────────────────────┘
```

**Caracteristicas:**
- Color: Amarillo/Ambar degradado
- Boton directo a `/login`
- Mensaje claro de la causa

#### Error de Permisos
```
┌────────────────────────────────────────────┐
│ 🟠 No tienes permiso                       │
├────────────────────────────────────────────┤
│ No tienes autorizacion para realizar       │
│ esta accion. Contacta con el              │
│ administrador o intenta iniciar sesion    │
│ nuevamente.                                │
├────────────────────────────────────────────┤
│      [Iniciar Sesion]   [Cerrar]           │
└────────────────────────────────────────────┘
```

**Caracteristicas:**
- Color: Naranja/Rojo degradado
- Guidance sobre que hacer
- Opcion de login rapido

#### Error de Red
```
┌────────────────────────────────────────────┐
│ 🔵 Error de Conexion                       │
├────────────────────────────────────────────┤
│ No se pudo conectar con el servidor.       │
│ Verifica tu conexion a internet e          │
│ intenta nuevamente.                        │
├────────────────────────────────────────────┤
│         [Reintentar]   [Cerrar]            │
└────────────────────────────────────────────┘
```

**Caracteristicas:**
- Color: Azul/Cyan degradado
- Boton "Reintentar" que vuelve a ejecutar submit
- Diagnostico claro del problema

### 3. Scroll Automatico a Campos con Error

Se implemento `scrollToFirstError()` que:
- Mapea cada field error a su selector DOM
- Hace scroll smooth al primer campo con error
- Coloca focus en el elemento para facilitar correccion
- Centra el campo en la pantalla (block: 'center')

**Mapa de selectores:**
```typescript
const fieldToIdMap: Record<string, string> = {
  'dni_frente': 'input[type="file"]',
  'email': 'input[name="email"]',
  'telefono': 'input[type="tel"]',
  'dni': 'input[name="dni"]',
  'nombres': 'input[name="nombres"]',
  // ... etc
};
```

### 4. Validacion en Tiempo Real

- Cada input limpia su error cuando el usuario empieza a tipear
- Documentos limpian su error cuando se suben exitosamente
- Estado de validacion se actualiza dinamicamente

---

## Estilos y Animaciones

### Clases Tailwind Usadas

```css
/* Contenedor de error */
bg-gradient-to-br from-red-50 to-orange-50
border-2 border-red-300
rounded-xl shadow-md
animate-in fade-in slide-in-from-top-4 duration-300

/* Icono */
p-3 bg-red-100 rounded-xl shadow-sm

/* Lista de errores */
bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-red-200

/* Item de error */
flex items-start gap-3 group
group-hover:bg-red-200 transition-colors

/* Botones */
px-4 py-2 bg-red-600 text-white rounded-lg
hover:bg-red-700 transition-colors font-medium text-sm shadow-sm
```

### Paleta de Colores por Tipo

| Tipo | Primary | Secondary | Border |
|------|---------|-----------|--------|
| Validacion | red-50 | orange-50 | red-300 |
| Sesion | yellow-50 | amber-50 | yellow-400 |
| Permisos | orange-50 | red-50 | orange-400 |
| Red | blue-50 | cyan-50 | blue-400 |

---

## Testing Manual

### Escenarios a Probar

#### 1. Error de Validacion
**Pasos:**
1. Dejar campos vacios o con datos invalidos
2. Hacer clic en "Enviar para Revision"

**Resultado Esperado:**
- Banner de error rojo con lista de campos
- Scroll automatico al primer campo con error
- Campos con error resaltados en rojo
- Mensaje claro para cada campo

#### 2. Error de Sesion
**Pasos:**
1. Esperar a que expire la sesion (o simular)
2. Intentar enviar el formulario

**Resultado Esperado:**
- Banner amarillo de "Sesion Expirada"
- Boton "Iniciar Sesion" funcional
- Redireccion a `/login`

#### 3. Limpiar Errores
**Pasos:**
1. Generar errores de validacion
2. Corregir el primer campo

**Resultado Esperado:**
- Error de ese campo desaparece de la lista
- Campo ya no esta resaltado en rojo
- Contador de errores se actualiza

#### 4. Scroll Automatico
**Pasos:**
1. Hacer scroll hasta el final del formulario
2. Dejar un campo del inicio con error
3. Hacer clic en "Enviar"
4. Hacer clic en "Ir al primer campo"

**Resultado Esperado:**
- Scroll suave hacia el campo con error
- Campo queda centrado en pantalla
- Focus automatico en el campo

---

## Campos Validados

### Comunes (todos los tipos)
- Email (formato valido)
- Celular (9 digitos, empieza con 9)
- Direccion declarada (minimo 10 caracteres)

### Persona Natural
- DNI (8 digitos)
- Nombres (minimo 2 caracteres)
- Apellido Paterno (minimo 2 caracteres)
- Apellido Materno (minimo 2 caracteres)

### Persona Juridica
- RUC (11 digitos, empieza con 10 o 20)
- Razon Social (minimo 3 caracteres)
- Representante Legal (minimo 3 caracteres)
- DNI Representante (8 digitos)

### Documentos
- DNI Frente (requerido)
- DNI Reverso (requerido)
- Recibo Luz o Agua (requerido)
- Declaracion Jurada (requerido)

---

## Mensajes de Validacion

| Campo | Mensaje de Error |
|-------|------------------|
| Email | Email valido es requerido |
| Celular vacio | Celular es requerido |
| Celular invalido | El celular debe tener 9 digitos |
| Celular no empieza con 9 | El celular debe empezar con 9 |
| DNI vacio | DNI es requerido |
| DNI invalido | DNI debe ser 8 digitos |
| RUC invalido | RUC debe ser 11 digitos (empezando con 10 o 20) |
| Direccion | Direccion declarada es requerida (minimo 10 caracteres) |
| DNI Frente | DNI (Frente) es requerido |
| DNI Reverso | DNI (Reverso) es requerido |
| Recibo | Recibo de Luz o Agua es requerido |
| Declaracion | Declaracion Jurada es requerida |

---

## Mejoras Tecnicas

### Performance
- Validacion en cliente evita llamadas innecesarias al servidor
- Deteccion de tipo de error sin procesamiento pesado
- Scroll con `behavior: 'smooth'` para mejor UX

### Accesibilidad
- Focus automatico en campos con error
- Colores con suficiente contraste
- Mensajes claros y descriptivos
- Iconos visuales acompañando texto

### Mantenibilidad
- Funciones separadas por responsabilidad
- Tipos de error claramente definidos
- Estilos consistentes usando Tailwind
- Facil agregar nuevos tipos de error

---

## Archivos Modificados

```
app/expansion/registro/RegistroCorredorClient.tsx
- Lineas 595-702: Agregado getErrorType() y scrollToFirstError()
- Lineas 847-1044: Reemplazado componente de error con sistema diferenciado
```

---

## Proximos Pasos (Opcionales)

- [ ] Agregar toast notifications para errores no criticos
- [ ] Implementar analytics de errores mas frecuentes
- [ ] Agregar hints preventivos antes de que ocurran errores
- [ ] Traduccion de mensajes a otros idiomas
- [ ] Tests unitarios para validateForm()
- [ ] Tests E2E con Playwright para escenarios de error

---

## Notas

- Los colores corporativos de EcoPlaza (#1b967a, #192c4d) no se usaron en los errores porque:
  - Rojo/Naranja: Universalmente reconocido como error
  - Amarillo: Para advertencias (sesion)
  - Azul: Para info de red
  - Mantener consistencia con patrones UX estandar

- El sistema es extensible: agregar nuevo tipo de error solo requiere:
  1. Agregar keyword en `getErrorType()`
  2. Agregar nuevo bloque condicional en el render
  3. Definir colores y mensaje

---

**Estado:** ✅ Completado
**Validado:** Pendiente testing manual
**Deploy:** Pendiente
