# Investigación: UX de Clase Mundial para Selectores de Ubicación y Google Maps

**Fecha:** 18 Enero 2026
**Investigador:** Claude (PM whatsapp-agent-ia-dashboard)
**Propósito:** Investigar mejores prácticas UX para selectores de ubicación en cascada (Ubigeo) y selección de direcciones con Google Maps

---

## Resumen Ejecutivo

Esta investigación analiza cómo las empresas líderes en tecnología (Airbnb, Booking, Uber, MercadoLibre, Rappi) implementan selectores de ubicación y direcciones, identificando patrones de UX de clase mundial y las mejores librerías de React/Next.js para 2026.

### Hallazgos Clave

1. **Combobox > Dropdown tradicional** - Los comboboxes con búsqueda son el estándar moderno
2. **Debouncing obligatorio** - 300-500ms de delay mejora performance dramáticamente
3. **Skeleton states superiores** - Mejoran percepción de performance vs spinners
4. **@vis.gl/react-google-maps** - Librería recomendada para Google Maps en React (v1.0 lanzado 2025)
5. **shadcn/ui + Radix** - Combinación ganadora para selectores accesibles y performantes

---

## PARTE 1: Selectores de Ubicación en Cascada (Ubigeo)

### Contexto

En Perú, el UBIGEO (Ubicación Geográfica) es el código oficial para identificar Departamento > Provincia > Distrito. Existen dos sistemas: INEI y RENIEC (no completamente compatibles).

### Mejores Prácticas UX 2026

#### 1. Nunca Usar Dropdowns Tradicionales para Listas Largas

**Problema identificado:**
- Dropdowns con más de 20 opciones abruman a usuarios
- Dificultad para localizar opciones
- Alto porcentaje de error en selección

**Fuente:** [Drop-Down Usability - Baymard Institute](https://baymard.com/blog/drop-down-usability) (Actualizado Enero 2025)

**Solución:** Combobox con búsqueda (autocomplete)

#### 2. Desacoplar Ubicación y Lenguaje/Moneda

**Best Practice Global:**
- NO asumir que ubicación = idioma = moneda
- Ejemplo: Usuario en Alemania puede preferir inglés y dólares
- Permitir configuración independiente de cada aspecto

**Fuente:** [Country and Language Selector UX Guidelines - Shopify](https://shopify.dev/docs/storefronts/themes/markets/country-language-ux)

**Aplicación en ECOPLAZA:**
- No asumir que un distrito específico determina el tipo de proyecto
- Permitir búsqueda flexible en todos los niveles

#### 3. Implementar Non-Modal Dialogs para Múltiples Opciones

**Cuándo usar:**
- 10-15 opciones: Non-modal overlay con autocomplete
- Más de 15: Página standalone con tabs/accordions

**Fuente:** [Designing Better Language Selector UX - Smashing Magazine](https://www.smashingmagazine.com/2022/05/designing-better-language-selector/)

#### 4. Evitar Cascadas Complejas que Causan "Fall-Out"

**Problema:**
- Múltiples niveles de cascada son difíciles de manipular físicamente
- Usuarios "caen fuera" del menú accidentalmente
- Alta tasa de error

**Solución Moderna:**
- Combobox searchable por nivel
- Loading states claros entre niveles
- Opción de "limpiar selección" visible

**Fuente:** [Menu Design Checklist - Nielsen Norman Group](https://www.nngroup.com/articles/menu-design/)

### Patrones de Diseño de Plataformas Líderes

#### Booking.com

**Patrón identificado:**
- Search widget prominente en centro de pantalla
- Indica ubicación + fechas + propósito del viaje
- Autocomplete con sugerencias en tiempo real

**Fuente:** [Booking UX Best Practices 2025](https://ralabs.org/blog/booking-ux-best-practices/)

**Principio:** Reducir incertidumbre y hacer la acción sin esfuerzo

#### MercadoLibre

**Sistema de Diseño: Andes**
- Migrado a Figma para escalabilidad
- Diseñado para conectar múltiples países sin homogeneizar todo
- Preserva "voz local" de cada región

**Fuente:** [How Mercado Libre Scales Design with Figma](https://www.figma.com/customers/mercado-libre-scales-design-across-latin-america/)

**Aplicación:** Un selector de ubicación debe ser flexible para diferentes contextos (urbano/rural, costa/sierra/selva en Perú)

#### Airbnb

**Estrategia de Conversión:**
- Ubicación como primer paso prominente
- Validación progresiva (no bloquear hasta el final)
- Sugerencias contextuales basadas en popularidad

**Fuente:** [Why Airbnb's UX Design Strategy Converts So Well](https://alchemyleads.com/why-airbnbs-ux-design-strategy-converts-so-well/)

### Componentes Recomendados para React/Next.js 2026

#### Opción 1: shadcn/ui Combobox (RECOMENDADO)

**Ventajas:**
- Composición de Popover + Command components
- Soporte nativo para async data
- Navegación por teclado incorporada
- Custom rendering flexible

**Documentación:** [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/combobox)

**Características clave:**
- Debounce integrado (300-500ms recomendado)
- 42+ variantes pre-construidas en [Shadcn Blocks](https://www.shadcnblocks.com/components/combobox)
- TypeScript-first

**Ejemplo de implementación (concepto):**
```
ComboboxDemo usa:
- React.useState para open/close state
- React.useState para valor seleccionado
- Popover para dropdown
- Command para búsqueda y navegación
```

**Fuente:** [Building Custom Combobox with Remote Data - Medium](https://afifm.medium.com/building-a-custom-combobox-with-remote-data-in-react-using-shadcn-ui-and-typescript-0f848bc71022)

#### Opción 2: Radix UI Select + Combobox

**Ventajas:**
- Headless primitives - máxima personalización
- ARIA-compliant out-of-the-box
- Modular (cada componente es paquete NPM separado)

**Documentación:**
- [Radix UI Select](https://www.radix-ui.com/primitives/docs/components/select)
- [Ariakit + Radix Combobox Example](https://ariakit.org/examples/combobox-radix-select)

**Cuándo elegir:**
- Necesitas máxima flexibilidad de diseño
- Prioridad en accesibilidad y keyboard navigation
- Arquitectura modular es importante

**Fuente:** [Headless UI vs Radix 2025 Comparison](https://www.subframe.com/tips/headless-ui-vs-radix)

#### Opción 3: Headless UI Combobox

**Ventajas:**
- Soporta React Y Vue
- Integración perfecta con Tailwind CSS
- Lightweight
- Positioning automático con prop `anchor`

**Documentación:** [Headless UI Combobox](https://headlessui.com/react/combobox)

**Cuándo elegir:**
- Ya usas Tailwind CSS extensivamente
- Necesitas soporte para Vue también
- Prefieres conjunto pequeño de componentes bien testeados

**Fuente:** [Headless UI vs Radix - Lodely](https://www.lodely.com/blog/headless-ui-vs-radix-ui)

#### Comparación: Bundle Size

| Librería | Bundle Size | Performance | Accesibilidad |
|----------|-------------|-------------|---------------|
| React-Select | 29.5kb | Medio (requiere optimización para 10k+ items) | Buena |
| Radix UI | Muy ligero (headless) | Excelente | Excelente (ARIA native) |
| Headless UI | ~16.7kb | Excelente | Excelente (ARIA-compliant) |
| shadcn/ui | Ligero (usa Radix internamente) | Excelente | Excelente |

**Fuente:** [React Select vs Radix Performance Comparison - Bundlephobia](https://bundlephobia.com/package/react-select)

**Recomendación para ECOPLAZA:** shadcn/ui Combobox (mejor balance entre DX, UX y customización)

### Implementación de Debouncing (CRÍTICO)

#### Por Qué es Obligatorio

**Problema sin debounce:**
- Usuario escribe "Lima" (4 caracteres) = 4 API calls
- Con 100 usuarios simultáneos = sobrecarga de servidor
- UX laggy por requests excesivos

**Solución con debounce:**
- Espera 300-500ms después que usuario deja de escribir
- Solo 1 API call por búsqueda completa
- 75-90% reducción en requests

**Fuente:** [Debounce Your Search - React Optimization - Medium](https://medium.com/nerd-for-tech/debounce-your-search-react-input-optimization-fd270a8042b)

#### Implementación con Custom Hook

**Patrón recomendado:**
```
useDebounce Hook:
- useState para valor debounced
- useEffect con setTimeout
- Delay típico: 300-500ms
- Cleanup del timeout en cada cambio
```

**Fuente:** [useDebounce Hook in React - Medium](https://medium.com/@sankalpa115/usedebounce-hook-in-react-2c71f02ff8d8)

#### Optimizaciones Adicionales

1. **Caching con Map:**
   - Almacenar búsquedas previas
   - Reducir requests repetidos
   - Mejora percepción de velocidad

2. **Virtual Scrolling:**
   - Para listas 10k+ items
   - Solo renderiza items visibles
   - `virtualScroller={true}` en componentes compatibles

**Fuente:**
- [Optimize React-Select for 10k+ Data - Botsplash](https://www.botsplash.com/post/optimize-your-react-select-component-to-smoothly-render-10k-data)
- [Debounced Search Client-side Filtering - DEV](https://dev.to/goswamitushar/debounced-search-with-client-side-filtering-a-lightweight-optimization-for-large-lists-2mn2)

### Loading States y Skeleton UI

#### Por Qué Skeleton > Spinners

**Investigación Nielsen Norman Group:**
- Skeleton screens mejoran satisfacción de usuario
- Usuarios pueden "pre-visualizar" estructura de datos
- Mejora percepción de performance

**Fuente:** [Skeleton Loading Screen Design - LogRocket](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)

#### Dónde Usar Skeleton States

**SÍ usar:**
- Tiles y structured lists
- Data tables
- Cards con datos

**NO usar:**
- Toast notifications
- Overflow menus
- Dropdown items
- Modals
- Simple loaders

**Fuente:** [Loading Patterns - Carbon Design System](https://carbondesignsystem.com/patterns/loading-pattern/)

#### Implementación en React

**Librerías recomendadas:**

1. **shadcn/ui Skeleton**
   - [Documentación](https://ui.shadcn.com/docs/components/skeleton)
   - Integra con otros componentes shadcn

2. **Material UI Skeleton**
   - [Documentación](https://mui.com/material-ui/react-skeleton/)
   - Variantes: text, circular, rectangular, rounded

3. **React Loading Skeleton**
   - Más flexible y customizable
   - [Guía LogRocket](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/)

#### Best Practice: Simplificación

**Principio:**
- Complejidad excesiva en skeleton = peor UX
- Usar placeholders simples para grupos de elementos
- Evitar sobre-detalle

**Fuente:** Skeleton loading research (LogRocket 2026)

### Dependent Dropdowns (Cascadas)

#### Patrón Moderno 2026

**Definición:**
Dropdown dependiente = opciones determinadas por selección previa

**Ejemplo Ubigeo:**
1. Usuario selecciona Departamento: "Lima"
2. Provincia dropdown se llena solo con provincias de Lima
3. Distrito dropdown se llena solo con distritos de provincia seleccionada

**Fuente:** [How to Build Dependent Dropdowns in React - freeCodeCamp](https://www.freecodecamp.org/news/how-to-build-dependent-dropdowns-in-react/) (Enero 2025)

#### Implementación Recomendada

**Patrón técnico:**
```
1. Estado para cada nivel (departamento, provincia, distrito)
2. useEffect que observa cambios en nivel superior
3. Al cambiar nivel superior:
   - Resetear niveles inferiores
   - Fetch nuevas opciones
   - Mostrar skeleton durante carga
4. Deshabilitar niveles inferiores hasta que superior esté seleccionado
```

**Consideraciones UX:**
- Mensaje claro: "Selecciona departamento primero"
- Icono de loading específico por nivel
- Opción de "Limpiar todo" visible
- Indicador visual de dependencia (iconos de cadena, líneas)

---

## PARTE 2: Google Maps Address Selection

### Contexto

Selección de dirección con mapa interactivo es crítico para apps de delivery, real estate, ride-sharing. Requiere sincronización bidireccional entre:
- Input de texto (autocomplete)
- Mapa con marker draggable
- Coordenadas lat/lng
- Dirección formateada

### Mejores Prácticas de Industria

#### Uber (Ride-Sharing)

**Uso de Place Autocomplete:**
- Ayuda a clientes ingresar pickup/dropoff locations con precisión
- Reduce errores de dirección significativamente
- Mejora ETA accuracy

**Fuente:** [Google Places Autocomplete Industry Use Cases](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)

#### Airbnb (Travel/Real Estate)

**Uso de Place APIs:**
- Place Details API para info de contacto
- Place Photos API para imágenes de atracciones
- User reviews y ratings integrados
- Opening hours de establecimientos cercanos

**Fuente:** [Google Places API Use Cases - AFI Blog](https://blog.afi.io/blog/finding-the-right-place-with-the-google-places-api/)

#### Real Estate Apps

**Uso de Nearby Search:**
- Mostrar amenidades a distancia caminable de propiedad
- Filtrar por tipo de lugar (escuelas, hospitales, transporte)
- Mejorar valor percibido de ubicación

**Fuente:** Google Places API Documentation (2026)

### Google Places Autocomplete API

#### Autocomplete (New) vs Legacy

**Nueva versión (2026):**
- Session-based pricing (más económico)
- Mejor performance
- Field masking para evitar datos innecesarios

**Documentación oficial:**
- [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Session Pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing)

#### Best Practices de Optimización

**1. Usar Sessions para Reducir Costos**

**Qué son sessions:**
- Bundling de requests relacionados con mismo token único
- Más barato que requests individuales
- Modelo de pricing consistente

**Fuente:** [Optimize UX with Place Autocomplete Tips - Google Maps Platform](https://mapsplatform.google.com/resources/blog/optimize-your-user-experience-these-place-autocomplete-tips/)

**2. Field Masking (CRÍTICO para billing)**

**Principio:**
- Solo pedir los campos que necesitas
- Evita procesamiento innecesario
- Reduce costos de billing

**Ejemplo:**
Si solo necesitas dirección formateada y coordenadas, NO pedir:
- Photos
- Reviews
- Opening hours
- Phone numbers

**Fuente:** [Places API Usage and Billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)

**3. Filtros de Tipo y Ubicación**

**Parámetros para refinar:**
- `location`: Coordenadas para bias geográfico
- `type`: Tipo de lugar (restaurant, school, etc.)
- `strictbounds`: Restringir a área específica

**Beneficio:**
- Resultados más relevantes
- Menos necesidad de refinamiento por usuario
- Mejor UX

### Google Maps Draggable Markers

#### AdvancedMarkerElement (Moderno)

**Nueva API 2026:**
- Propiedad `gmpDraggable: true` para habilitar drag
- Eventos: `dragstart`, `drag`, `dragend`
- InfoWindow para mostrar dirección actualizada

**Documentación:** [Make Markers Draggable - Google Maps API](https://developers.google.com/maps/documentation/javascript/advanced-markers/draggable-markers)

**Patrón común:**
```
1. Crear AdvancedMarkerElement con gmpDraggable: true
2. Escuchar evento dragend
3. Obtener nueva posición (lat/lng)
4. Ejecutar reverse geocoding
5. Actualizar input de texto con nueva dirección
```

#### Reverse Geocoding

**Propósito:**
Convertir coordenadas (lat, lng) a dirección humana-legible

**API de Google:**
- Servicio de Geocoding en Maps JavaScript API
- Resultados ordenados por precisión
- Incluye múltiples formatos de dirección

**Documentación:** [Reverse Geocoding - Google Maps](https://developers.google.com/maps/documentation/javascript/examples/geocoding-reverse)

**Best Practice:**
- NO usar Geocoding API directamente desde UI (no diseñado para respuesta a input de usuario)
- Usar Maps JavaScript API client geocoder
- Implementar debouncing si se actualiza durante drag (no solo dragend)

**Fuente:** [Google Reverse Geocoding Guide - AFI](https://blog.afi.io/blog/google-reverse-geocoding-get-addresses-from-coordinates/)

### Librerías de React para Google Maps 2026

#### Opción 1: @vis.gl/react-google-maps (RECOMENDADO)

**Por qué es la mejor opción 2026:**
- Versión 1.0 lanzada oficialmente (Vis.gl + OpenJS Foundation)
- TypeScript-first con tipos completos
- Component-based API alineado con React patterns
- Performance optimizado para interacciones complejas
- Integración con deck.gl para visualizaciones WebGL 2D/3D

**Documentación:** [React Google Maps - vis.gl](https://visgl.github.io/react-google-maps/)

**GitHub:** [visgl/react-google-maps](https://github.com/visgl/react-google-maps)

**Componentes clave:**
- `<Map>`: Componente principal
- `<AdvancedMarker>`: Markers modernos draggables
- Hooks para servicios y libraries de Maps API

**Soporte de AdvancedMarker:**
- Props: `onDragStart`, `onDrag`, `onDragEnd`
- Por defecto `draggable: true` si algún handler está especificado
- Evento `onDragEnd` ideal para reverse geocoding

**Fuente:**
- [AdvancedMarker Component Docs](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker)
- [Vis.gl Welcomes v1.0 - OpenJS Foundation](https://openjsf.org/blog/visgl-1.0-react-google-maps)

**Nota importante:**
- Librería open source, NO oficialmente soportada por Google
- Pero respaldada por OpenJS Foundation
- Última actualización: 12 Enero 2026

#### Opción 2: google-map-react

**Ventajas:**
- Ampliamente adoptada (comunidad grande)
- Integración con Geocoder service
- Soporte para autocomplete + draggable markers

**Limitaciones conocidas:**
- Draggable markers NO funcionan en touch devices
- Solución: Usar map click event en mobile

**Fuente:** [Google Maps in React with google-map-react - FreakJolly](https://www.freakyjolly.com/google-maps-in-react-example-application/)

**Cuándo elegir:**
- Necesitas compatibilidad con proyectos legacy
- Preferencia por librería con más años en producción
- No necesitas features más recientes de Maps API

#### Comparación: @vis.gl vs Extended Component Library

**@googlemaps/extended-component-library:**
- Web Components oficiales de Google
- Cobertura limitada a componentes featured
- Menos flexible

**@vis.gl/react-google-maps:**
- Cobertura completa de Maps JavaScript API
- Más componentes y funcionalidades
- Mejor para proyectos complejos

**Fuente:** [GitHub Discussion: vis.gl vs Extended Components](https://github.com/visgl/react-google-maps/discussions/272)

**Recomendación para ECOPLAZA:** @vis.gl/react-google-maps (v1.0 estable, performance superior, TypeScript)

### Patrones de Sincronización Input ↔ Mapa

#### Patrón Bidireccional Completo

**Flujo 1: Usuario escribe en input**
```
1. Usuario tipea en autocomplete input
2. Debounce 300ms
3. Google Places Autocomplete sugiere opciones
4. Usuario selecciona dirección
5. Obtener lat/lng de Place Details
6. Mover marker a nueva posición
7. Centrar mapa en marker
```

**Flujo 2: Usuario mueve marker**
```
1. Usuario arrastra marker en mapa
2. Evento dragend captura nueva posición (lat, lng)
3. Reverse geocoding convierte coords a dirección
4. Actualizar input de texto con dirección
5. (Opcional) Mostrar InfoWindow con dirección
```

**Fuente:** [Google Maps Autocomplete + Draggable Marker - Medium](https://imranhsayed.medium.com/google-maps-in-react-autocomplete-location-search-draggable-marker-marker-infobox-565ab8e8cf22)

#### Mobile-First Considerations

**Problemas en mobile:**
- Draggable markers pueden no funcionar en touch
- Pantalla pequeña dificulta precisión
- UX de autocomplete debe adaptarse

**Soluciones:**
1. **Click en mapa en lugar de drag:**
   - Más preciso en touch devices
   - Actualizar marker position en tap
   - Reverse geocoding en cada tap

2. **Botón "Usar mi ubicación":**
   - Geolocation API
   - Centrar mapa automáticamente
   - Reducir necesidad de búsqueda manual

3. **Input siempre visible:**
   - Sticky header con search
   - Botón de cerrar mapa que vuelve a input
   - Breadcrumb de selección actual

**Fuente:** [Location Picker React Native Maps - DEV](https://dev.to/dainyjose/building-a-location-picker-in-react-native-maps-with-draggable-marker-address-lookup-1d00) (Patrones aplicables a React web)

#### Ejemplo de Implementación Conceptual

**Stack recomendado:**
```
- @vis.gl/react-google-maps para mapa y markers
- shadcn/ui Combobox para autocomplete input
- Google Places Autocomplete API
- Google Geocoding API para reverse geocoding
- useDebounce custom hook
- React state management (useState/useReducer)
```

**Estado necesario:**
```
- address (string): Dirección formateada actual
- coordinates ({ lat, lng }): Posición actual
- isLoadingAutocomplete (boolean)
- isLoadingReverseGeocode (boolean)
- selectedPlace (Place object completo)
```

**Componentes:**
```
<LocationSelector>
  <SearchInput /> // shadcn Combobox con Places Autocomplete
  <Map center={coordinates}> // @vis.gl Map
    <AdvancedMarker
      position={coordinates}
      draggable
      onDragEnd={handleMarkerDragEnd}
    />
  </Map>
  <SelectedAddressDisplay /> // Muestra dirección formateada
</LocationSelector>
```

**Fuente:** Compilación de patrones de múltiples fuentes listadas

---

## Recomendaciones para ECOPLAZA

### Para Selectores de Ubicación en Cascada (Ubigeo)

#### Stack Tecnológico Recomendado

**Componente principal:**
- **shadcn/ui Combobox** (composición de Popover + Command)
  - Accesibilidad ARIA nativa
  - Búsqueda integrada
  - Customización total con Tailwind

**Implementación por nivel:**
```
<DepartamentoCombobox
  onSelect={handleDepartamentoChange}
  isLoading={isLoadingDepartamentos}
/>

<ProvinciaCombobox
  departamentoId={selectedDepartamento}
  onSelect={handleProvinciaChange}
  disabled={!selectedDepartamento}
  isLoading={isLoadingProvincias}
/>

<DistritoCombobox
  provinciaId={selectedProvincia}
  onSelect={handleDistritoChange}
  disabled={!selectedProvincia}
  isLoading={isLoadingDistritos}
/>
```

**Features obligatorias:**
1. **Debouncing 300-500ms** en búsqueda
2. **Skeleton loading states** entre selecciones
3. **Clear button** visible para resetear cascada
4. **Disabled state** claro en niveles dependientes
5. **Error boundaries** para manejo de fallos de API

#### Flujo UX Recomendado

**Paso 1: Departamento**
- Lista completa de 25 departamentos peruanos
- Búsqueda por nombre
- Iconos regionales (costa/sierra/selva) opcionales
- Al seleccionar: Cargar provincias

**Paso 2: Provincia**
- Mostrar skeleton mientras carga
- Filtrado automático por departamento
- Búsqueda habilitada
- Clear button resetea también distrito

**Paso 3: Distrito**
- Similar a provincia
- Opción de "Ver en mapa" (integrar con Google Maps)

**Paso 4 (Opcional): Dirección específica**
- Google Places Autocomplete restringido al distrito
- Validar que dirección esté dentro de límites
- Guardar coordenadas para uso futuro

#### Manejo de Datos UBIGEO

**Fuentes recomendadas:**
- [ubigeo-peru-select](https://github.com/mvegap/ubigeo-peru-select): Códigos actualizados 2025 INEI y RENIEC
- [jmcastagnetto/ubigeo](https://github.com/jmcastagnetto/ubigeo): Mappings entre sistemas INEI/RENIEC

**Estrategia de carga:**
- Departamentos: Cargar en bundle (son solo 25)
- Provincias: API call al seleccionar departamento (cache en React Query)
- Distritos: API call al seleccionar provincia (cache en React Query)

**Estructura de API:**
```
GET /api/ubigeo/departamentos
GET /api/ubigeo/provincias?departamento_id=XX
GET /api/ubigeo/distritos?provincia_id=XXXX
```

### Para Google Maps Address Selection

#### Stack Tecnológico Recomendado

**Librería de mapa:**
- **@vis.gl/react-google-maps** v1.0+
  - TypeScript nativo
  - AdvancedMarker con drag
  - Performance optimizado
  - Hooks para servicios de Google

**Componente de búsqueda:**
- **shadcn/ui Combobox** integrado con Places Autocomplete API
  - Consistencia visual con resto de app
  - Debouncing nativo
  - Loading states

**APIs de Google:**
- Places API (New) - Autocomplete
- Geocoding API - Reverse geocoding
- Maps JavaScript API

#### Implementación Recomendada

**Componente MapAddressSelector:**
```
Estructura visual:
┌─────────────────────────────────┐
│ [🔍 Buscar dirección...]        │ ← Combobox con autocomplete
├─────────────────────────────────┤
│                                 │
│         [Mapa Interactivo]      │
│              📍                 │ ← Marker draggable
│                                 │
├─────────────────────────────────┤
│ 📍 Av. Javier Prado 123, Lima   │ ← Dirección seleccionada
│ Lat: -12.0931, Lng: -77.0465    │
│ [Confirmar Ubicación]           │
└─────────────────────────────────┘
```

**Features obligatorias:**

1. **Búsqueda con autocomplete:**
   - Integración Places Autocomplete API
   - Sugerencias en tiempo real
   - Debounce 300ms
   - Skeleton durante búsqueda

2. **Marker draggable:**
   - `gmpDraggable: true`
   - Evento `onDragEnd`
   - Reverse geocoding automático
   - Loading indicator durante geocoding

3. **Sincronización bidireccional:**
   - Escribir en input → Mover marker
   - Arrastrar marker → Actualizar input
   - Estado único de verdad (single source of truth)

4. **Mobile-first:**
   - Tap en mapa (no solo drag)
   - Botón "Usar mi ubicación"
   - Mapa de altura fija en mobile
   - Input sticky en top

5. **Session management:**
   - Usar session tokens para Places API
   - Reducir costos de billing
   - Field masking: Solo dirección + coordenadas

#### Optimizaciones de Performance

**1. Lazy loading del mapa:**
```
- No cargar Maps API hasta que usuario interactúe
- Mostrar imagen estática inicial
- Botón "Seleccionar en mapa" carga API
```

**2. Caching de búsquedas:**
```
- React Query para cachear resultados de Places
- TTL de 1 hora para búsquedas de ubicación
- Invalidar cache solo si usuario cambia proyecto/distrito
```

**3. Geocoding responsivo:**
```
- Debounce de drag events (solo dragend)
- Mostrar coordenadas inmediato
- Dirección formateada con delay
- Skeleton text durante geocoding
```

#### Restricciones Geográficas

**Para proyectos ECOPLAZA:**
- Restringir autocomplete a Perú: `componentRestrictions: { country: 'PE' }`
- Bias hacia Lima si proyecto es limeño
- Validar que coordenadas estén en distrito esperado
- Alertar si ubicación está fuera de área de proyecto

#### Formato de Datos a Guardar

**En base de datos:**
```json
{
  "address_formatted": "Av. Javier Prado Este 456, San Isidro 15036",
  "address_components": {
    "street": "Av. Javier Prado Este",
    "number": "456",
    "district": "San Isidro",
    "province": "Lima",
    "department": "Lima",
    "postal_code": "15036"
  },
  "coordinates": {
    "lat": -12.093130,
    "lng": -77.046547
  },
  "ubigeo_code": "150131", // INEI code
  "google_place_id": "ChIJ...", // Para futuras consultas
  "selected_method": "map_drag", // autocomplete | map_drag | my_location
  "selected_at": "2026-01-18T10:30:00Z"
}
```

### Integración Completa: Ubigeo + Google Maps

**Flujo combinado recomendado:**

**Opción A: Ubigeo primero, luego mapa**
```
1. Usuario selecciona Departamento > Provincia > Distrito (cascada)
2. Botón "Especificar dirección en mapa" se habilita
3. Mapa abre centrado en distrito seleccionado
4. Places Autocomplete restringido a distrito
5. Usuario refina ubicación exacta
6. Guardar ubigeo + coordenadas + dirección completa
```

**Ventaja:** Validación de que dirección está en ubigeo correcto

**Opción B: Búsqueda libre primero, derivar ubigeo**
```
1. Usuario busca dirección directamente en autocomplete
2. Sistema extrae ubigeo de componentes de dirección de Google
3. Rellenar cascada automáticamente
4. Permitir override manual si Google se equivocó
```

**Ventaja:** UX más rápida para usuarios que saben su dirección

**Recomendación:** Implementar ambas opciones con toggle

---

## Casos de Uso Específicos para ECOPLAZA

### Caso 1: Registro de Nuevo Local Comercial

**Componentes necesarios:**
1. Ubigeo selector (Dpto > Prov > Distrito)
2. Google Maps para ubicación exacta
3. Validación de zona comercial (usar Nearby Search para verificar comercios cercanos)

**Validaciones:**
- Coordenadas dentro de límites de distrito seleccionado
- No duplicar local en mismas coordenadas
- Alertar si ubicación está en zona residencial (bajo potencial comercial)

### Caso 2: Asignación de Lead a Proyecto

**Componentes necesarios:**
1. Autocomplete de dirección de lead
2. Cálculo automático de distancia a proyectos
3. Sugerencia de proyecto más cercano

**Lógica:**
```
1. Lead ingresa dirección con Places Autocomplete
2. Sistema obtiene coordenadas
3. Calcula distancia a todos proyectos activos (Haversine formula)
4. Sugiere proyecto dentro de radio de 5km
5. Permite override manual si lead prefiere otro proyecto
```

### Caso 3: Dashboard de Mapa de Calor (Heat Map)

**Uso de datos de ubicación:**
- Visualizar densidad de leads por distrito
- Identificar zonas de alta conversión
- Planificar ubicación de nuevos proyectos

**Librerías adicionales:**
- deck.gl layers (ya incluido con @vis.gl/react-google-maps)
- HeatmapLayer para visualización
- Clustering de markers para performance

---

## Checklist de Implementación

### Pre-requisitos

- [ ] Google Maps API Key configurada
- [ ] Places API habilitada en Google Cloud Console
- [ ] Geocoding API habilitada
- [ ] Billing account activa (requerido para Maps APIs)
- [ ] Restricciones de API key por dominio configuradas

### Fase 1: Selectores de Ubicación en Cascada

- [ ] Instalar shadcn/ui CLI
- [ ] Agregar Combobox component
- [ ] Agregar Skeleton component
- [ ] Crear API endpoints para ubigeo
- [ ] Implementar useDebounce hook
- [ ] Crear DepartamentoCombobox
- [ ] Crear ProvinciaCombobox
- [ ] Crear DistritoCombobox
- [ ] Implementar loading states
- [ ] Implementar error handling
- [ ] Testing con datos reales de Perú

### Fase 2: Google Maps Integration

- [ ] Instalar @vis.gl/react-google-maps
- [ ] Configurar Maps provider
- [ ] Crear MapAddressSelector component
- [ ] Integrar Places Autocomplete
- [ ] Implementar draggable marker
- [ ] Implementar reverse geocoding
- [ ] Sincronización bidireccional input ↔ mapa
- [ ] Mobile-first responsive design
- [ ] Session tokens para Places API
- [ ] Field masking configurado
- [ ] Testing en mobile devices

### Fase 3: Integración y Validación

- [ ] Combinar Ubigeo selector con Maps
- [ ] Validación de coordenadas vs ubigeo
- [ ] Guardar estructura de datos completa
- [ ] Migración de datos existentes (si aplica)
- [ ] Performance testing con 1000+ registros
- [ ] A/B testing de flujo UX
- [ ] Documentación de uso para equipo

### Fase 4: Features Avanzadas (Opcional)

- [ ] Heat map de densidad de leads
- [ ] Clustering de markers
- [ ] Nearby Search para POIs
- [ ] Cálculo de rutas con Directions API
- [ ] Exportar a KML/GeoJSON
- [ ] Dashboard de analytics geográficos

---

## Estimación de Costos (Google Maps APIs)

### Places API (New) - Session-based

**Autocomplete:**
- Autocomplete (per session): $0.00283 USD
- Autocomplete including Place Details: $0.0173 USD

**Field masking crítico:**
- Solo pedir: formatted_address, geometry (location)
- Evitar: photos, reviews, opening_hours = reducción 60% costos

**Estimación mensual:**
- 1000 búsquedas de dirección/mes = ~$17 USD
- 5000 búsquedas/mes = ~$85 USD

### Geocoding API

**Reverse geocoding:**
- $0.005 USD per request

**Estimación mensual:**
- 1000 drag events/mes = $5 USD
- 5000 drag events/mes = $25 USD

### Maps JavaScript API

**Dynamic Maps:**
- 0-100,000 loads/mes: $7.00 per 1,000 loads
- 100,001-500,000: $5.60 per 1,000 loads

**Estimación mensual:**
- 10,000 map loads = $70 USD
- 50,000 map loads = $350 USD

**Total estimado para ECOPLAZA (moderado):**
- ~$170 USD/mes (5000 búsquedas + 5000 geocoding + 10k maps)

**Optimizaciones para reducir:**
- Implementar session tokens: -30% en Places
- Field masking agresivo: -60% en Places Details
- Lazy loading de mapas: -40% en Maps loads
- Caching React Query: -50% en requests repetidos

**Potencial ahorro:** $85 USD/mes (~50% reducción)

---

## Fuentes Consultadas

### UX Design y Best Practices

1. [Drop-Down Usability - Baymard Institute](https://baymard.com/blog/drop-down-usability)
2. [Country and Language Selector UX Guidelines - Shopify](https://shopify.dev/docs/storefronts/themes/markets/country-language-ux)
3. [Designing Better Language Selector UX - Smashing Magazine](https://www.smashingmagazine.com/2022/05/designing-better-language-selector/)
4. [Menu Design Checklist - Nielsen Norman Group](https://www.nngroup.com/articles/menu-design/)
5. [Booking UX Best Practices 2025 - Ralabs](https://ralabs.org/blog/booking-ux-best-practices/)
6. [How Mercado Libre Scales Design with Figma](https://www.figma.com/customers/mercado-libre-scales-design-across-latin-america/)
7. [Why Airbnb's UX Design Strategy Converts So Well - AlchemyLeads](https://alchemyleads.com/why-airbnbs-ux-design-strategy-converts-so-well/)
8. [Skeleton Loading Screen Design - LogRocket](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)
9. [Loading Patterns - Carbon Design System](https://carbondesignsystem.com/patterns/loading-pattern/)

### React Components Libraries

10. [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/combobox)
11. [shadcn/ui Select](https://ui.shadcn.com/docs/components/select)
12. [shadcn/ui Command](https://ui.shadcn.com/docs/components/command)
13. [Radix UI Select](https://www.radix-ui.com/primitives/docs/components/select)
14. [Headless UI Combobox](https://headlessui.com/react/combobox)
15. [Ariakit + Radix Combobox Example](https://ariakit.org/examples/combobox-radix-select)
16. [Headless UI vs Radix 2025 Comparison - Subframe](https://www.subframe.com/tips/headless-ui-vs-radix)
17. [React Select Bundle Size - Bundlephobia](https://bundlephobia.com/package/react-select)
18. [Building Custom Combobox with Remote Data - Medium](https://afifm.medium.com/building-a-custom-combobox-with-remote-data-in-react-using-shadcn-ui-and-typescript-0f848bc71022)
19. [Shadcn Blocks - Combobox Components](https://www.shadcnblocks.com/components/combobox)

### Performance Optimization

20. [Debounce Your Search - React Optimization - Medium](https://medium.com/nerd-for-tech/debounce-your-search-react-input-optimization-fd270a8042b)
21. [useDebounce Hook in React - Medium](https://medium.com/@sankalpa115/usedebounce-hook-in-react-2c71f02ff8d8)
22. [Optimize React-Select for 10k+ Data - Botsplash](https://www.botsplash.com/post/optimize-your-react-select-component-to-smoothly-render-10k-data)
23. [Debounced Search Client-side Filtering - DEV](https://dev.to/goswamitushar/debounced-search-with-client-side-filtering-a-lightweight-optimization-for-large-lists-2mn2)
24. [Handling React Loading States - LogRocket](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/)
25. [How to Build Dependent Dropdowns in React - freeCodeCamp](https://www.freecodecamp.org/news/how-to-build-dependent-dropdowns-in-react/)

### Google Maps APIs

26. [Google Places Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
27. [Session Pricing - Places API](https://developers.google.com/maps/documentation/places/web-service/session-pricing)
28. [Optimize UX with Place Autocomplete Tips - Google](https://mapsplatform.google.com/resources/blog/optimize-your-user-experience-these-place-autocomplete-tips/)
29. [Places API Usage and Billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
30. [Make Markers Draggable - Google Maps API](https://developers.google.com/maps/documentation/javascript/advanced-markers/draggable-markers)
31. [Reverse Geocoding - Google Maps](https://developers.google.com/maps/documentation/javascript/examples/geocoding-reverse)
32. [Google Reverse Geocoding Guide - AFI](https://blog.afi.io/blog/google-reverse-geocoding-get-addresses-from-coordinates/)
33. [Finding the Right Place with Google Places API - AFI](https://blog.afi.io/blog/finding-the-right-place-with-the-google-places-api/)
34. [Geocoding API Overview](https://developers.google.com/maps/documentation/geocoding/overview)

### React Google Maps Libraries

35. [React Google Maps - vis.gl](https://visgl.github.io/react-google-maps/)
36. [visgl/react-google-maps - GitHub](https://github.com/visgl/react-google-maps)
37. [AdvancedMarker Component Docs](https://visgl.github.io/react-google-maps/docs/api-reference/components/advanced-marker)
38. [Vis.gl Welcomes v1.0 - OpenJS Foundation](https://openjsf.org/blog/visgl-1.0-react-google-maps)
39. [Google Maps in React with google-map-react - FreakJolly](https://www.freakyjolly.com/google-maps-in-react-example-application/)
40. [GitHub Discussion: vis.gl vs Extended Components](https://github.com/visgl/react-google-maps/discussions/272)
41. [Google Maps Autocomplete + Draggable Marker - Medium](https://imranhsayed.medium.com/google-maps-in-react-autocomplete-location-search-draggable-marker-marker-infobox-565ab8e8cf22)
42. [Location Picker React Native Maps - DEV](https://dev.to/dainyjose/building-a-location-picker-in-react-native-maps-with-draggable-marker-address-lookup-1d00)

### Ubigeo Peru Resources

43. [ubigeo-peru-select - GitHub](https://github.com/mvegap/ubigeo-peru-select)
44. [jmcastagnetto/ubigeo - GitHub](https://github.com/jmcastagnetto/ubigeo)

### Case Studies

45. [Uber Eats UX Case Study - Baymard Institute](https://baymard.com/ux-benchmark/case-studies/uber-eats)
46. [Booking.com UX Case Study - Baymard Institute](https://baymard.com/ux-benchmark/case-studies/booking-com)
47. [Airbnb UX Case Study - Baymard Institute](https://baymard.com/ux-benchmark/case-studies/airbnb)

---

**Última Actualización:** 18 Enero 2026
**Próxima Revisión Recomendada:** Junio 2026 (nuevas features de Google Maps I/O 2026)
