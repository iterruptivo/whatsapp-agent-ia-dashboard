# Checklist de Implementación: GenerarConstanciaButton

## Fase 1: Componente UI ✅ COMPLETADO

- [x] Crear componente `GenerarConstanciaButton.tsx`
- [x] Implementar 3 variantes (separación, abono, cancelación)
- [x] Agregar estados (normal, loading, disabled)
- [x] Implementar descarga de archivos
- [x] Modal de alertas para errores
- [x] Estilos Tailwind CSS
- [x] Accesibilidad (aria-labels)
- [x] TypeScript sin errores
- [x] Props correctamente tipadas
- [x] Documentación README
- [x] Ejemplos de integración
- [x] Página de prueba visual

## Fase 2: Server Actions ⏳ PENDIENTE

### 2.1 Crear archivo base
- [ ] Crear `lib/actions-constancias.ts`
- [ ] Agregar directiva `'use server'`
- [ ] Importar dependencias necesarias

### 2.2 Función: generateConstanciaSeparacion
- [ ] Implementar función
- [ ] Obtener datos del control de pago
- [ ] Cargar template .docx
- [ ] Reemplazar placeholders
- [ ] Retornar ArrayBuffer
- [ ] Manejar errores
- [ ] Testing con datos reales

### 2.3 Función: generateConstanciaAbono
- [ ] Implementar función
- [ ] Obtener datos del abono
- [ ] Obtener datos del control de pago
- [ ] Cargar template .docx
- [ ] Reemplazar placeholders
- [ ] Retornar ArrayBuffer
- [ ] Manejar errores
- [ ] Testing con datos reales

### 2.4 Función: generateConstanciaCancelacion
- [ ] Implementar función
- [ ] Obtener datos completos del pago
- [ ] Calcular totales
- [ ] Cargar template .docx
- [ ] Reemplazar placeholders
- [ ] Retornar ArrayBuffer
- [ ] Manejar errores
- [ ] Testing con datos reales

## Fase 3: Templates DOCX ⏳ PENDIENTE

### 3.1 Template de Separación
- [ ] Crear `templates/constancia-separacion.docx`
- [ ] Diseñar layout
- [ ] Agregar logo EcoPlaza
- [ ] Definir placeholders
- [ ] Validar formato

### 3.2 Template de Abono
- [ ] Crear `templates/constancia-abono.docx`
- [ ] Diseñar layout
- [ ] Agregar logo EcoPlaza
- [ ] Definir placeholders
- [ ] Validar formato

### 3.3 Template de Cancelación
- [ ] Crear `templates/constancia-cancelacion.docx`
- [ ] Diseñar layout
- [ ] Agregar logo EcoPlaza
- [ ] Definir placeholders
- [ ] Tabla de resumen de pagos
- [ ] Validar formato

## Fase 4: Integración en PagosPanel ⏳ PENDIENTE

### 4.1 Import
- [ ] Importar `GenerarConstanciaButton`
- [ ] Verificar no hay errores

### 4.2 Botón de Separación
- [ ] Agregar después del checkbox de separación pagada
- [ ] Validar que solo aparezca cuando `estado === 'completado'`
- [ ] Testing funcional
- [ ] Validar descarga

### 4.3 Botones de Abono
- [ ] Agregar en cada abono verificado
- [ ] Validar que solo aparezca cuando `verificado_finanzas === true`
- [ ] Testing funcional
- [ ] Validar descarga

### 4.4 Botón de Cancelación
- [ ] Agregar en banner de stats
- [ ] Validar que solo aparezca cuando saldo = 0
- [ ] Testing funcional
- [ ] Validar descarga

## Fase 5: Testing ⏳ PENDIENTE

### 5.1 Testing Manual
- [ ] Generar constancia de separación
- [ ] Verificar datos correctos
- [ ] Verificar formato del documento
- [ ] Probar con diferentes navegadores
- [ ] Generar constancia de abono
- [ ] Verificar datos correctos
- [ ] Generar constancia de cancelación
- [ ] Verificar cálculos de totales
- [ ] Verificar tabla de resumen

### 5.2 Testing de Errores
- [ ] Sin conexión a BD
- [ ] Datos inválidos
- [ ] Template no encontrado
- [ ] Permisos de archivo
- [ ] Validar mensajes de error

### 5.3 Testing de UI
- [ ] Estados de loading
- [ ] Modal de confirmación
- [ ] Modal de error
- [ ] Responsive en mobile
- [ ] Accesibilidad con lector de pantalla

## Fase 6: Documentación Final ⏳ PENDIENTE

- [ ] Actualizar README principal
- [ ] Documentar placeholders de templates
- [ ] Screenshots de constancias generadas
- [ ] Video demo (opcional)
- [ ] Guía para usuario final

## Fase 7: Deploy ⏳ PENDIENTE

- [ ] Verificar que templates estén en build
- [ ] Probar en staging
- [ ] Verificar logs de Vercel
- [ ] Deploy a producción
- [ ] Testing post-deploy
- [ ] Monitoreo de errores

## Notas Importantes

### Dependencias Necesarias
```json
{
  "docx-templates": "^4.x.x",  // Para generar .docx
  "docx": "^8.x.x"              // Opcional: alternativa
}
```

### Datos Requeridos para Templates

**Separación**:
- Nombre cliente
- DNI/RUC
- Código local
- Proyecto
- Fecha de separación
- Monto de separación
- Método de pago
- Fecha de emisión

**Abono**:
- Todo lo de separación +
- Número de abono
- Monto del abono
- Fecha del abono
- Saldo pendiente

**Cancelación**:
- Todo lo anterior +
- Tabla de todos los pagos
- Total pagado
- Fecha de cancelación total

### Placeholders Sugeridos

```
{cliente_nombre}
{cliente_dni}
{codigo_local}
{proyecto_nombre}
{fecha_separacion}
{monto_separacion}
{metodo_pago}
{fecha_emision}
{numero_abono}
{monto_abono}
{saldo_pendiente}
{total_pagado}
{tabla_pagos}  // Loop con docx-templates
```

---

**Última actualización**: 2025-01-01
**Estado global**: Fase 1 completada, Fase 2-7 pendientes
**Tiempo estimado total**: 8-10 horas
**Prioridad**: Alta
