# Purchase Requisitions Components

Componentes UI de alta calidad para el módulo de Solicitudes de Compra (Purchase Requisitions).

## Componentes Creados

### 1. PRStatusBadge.tsx

Badge para mostrar el estado de una PR con colores corporativos.

**Props:**
```typescript
{
  status: PRStatus;           // 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'completed' | 'cancelled'
  size?: 'sm' | 'md' | 'lg';  // Tamaño del badge (default: 'md')
  className?: string;          // Clases adicionales
}
```

**Uso:**
```tsx
<PRStatusBadge status="pending_approval" size="sm" />
```

---

### 2. PRPriorityBadge.tsx

Badge para mostrar la prioridad de una PR.

**Props:**
```typescript
{
  priority: PRPriority;        // 'urgent' | 'high' | 'normal' | 'low'
  size?: 'sm' | 'md' | 'lg';  // Tamaño del badge (default: 'md')
  className?: string;          // Clases adicionales
}
```

**Uso:**
```tsx
<PRPriorityBadge priority="urgent" size="md" />
```

---

### 3. PRTimeline.tsx

Timeline vertical que muestra el historial completo de una PR (acciones + comentarios).

**Props:**
```typescript
{
  history: PRApprovalHistory[];  // Historial de acciones
  comments: PRComment[];         // Comentarios de la PR
}
```

**Features:**
- Combina historial y comentarios ordenados por fecha
- Muestra iconos y colores según el tipo de acción
- Formato de fecha relativo ("hace 2 horas")
- Indica cambios de estado
- Distingue comentarios internos

**Uso:**
```tsx
<PRTimeline history={data.history} comments={data.comments} />
```

---

### 4. PRList.tsx

Tabla/lista responsive para mostrar múltiples PRs.

**Props:**
```typescript
{
  prs: PurchaseRequisition[];                    // Array de PRs
  isLoading?: boolean;                            // Estado de carga
  onViewPR: (pr: PurchaseRequisition) => void;   // Callback al clickear una PR
}
```

**Features:**
- Vista tabla en desktop
- Vista cards en mobile
- Estado vacío personalizado
- Loader con spinner
- Click en fila para ver detalle

**Uso:**
```tsx
<PRList
  prs={myPRs}
  isLoading={loading}
  onViewPR={(pr) => router.push(`/pr/${pr.id}`)}
/>
```

---

### 5. PRApprovalInbox.tsx

Bandeja de aprobación con botones de acción para aprobar/rechazar PRs.

**Props:**
```typescript
{
  prs: PurchaseRequisition[];   // PRs pendientes de aprobación
  isLoading?: boolean;           // Estado de carga
  onPRUpdated: () => void;       // Callback después de aprobar/rechazar
}
```

**Features:**
- Muestra SLA (tiempo restante para aprobar)
- Prioriza PRs urgentes (ordenadas por prioridad)
- Botones de aprobar/rechazar
- Modal para ingresar razón de rechazo
- Toast notifications
- Loader en botones durante procesamiento

**Uso:**
```tsx
<PRApprovalInbox
  prs={pendingPRs}
  isLoading={loading}
  onPRUpdated={reloadPRs}
/>
```

---

### 6. CreatePRForm.tsx

Formulario completo para crear nueva solicitud de compra.

**Props:**
```typescript
{
  onSuccess: (prId: string, isDraft: boolean) => void;  // Callback al crear exitosamente
  onCancel: () => void;                                  // Callback al cancelar
}
```

**Features:**
- Validación client-side
- Cálculo automático de monto total
- Muestra regla de aprobación que aplicará según el monto
- Dos botones: "Guardar Borrador" y "Enviar a Aprobación"
- Select de categorías con emojis
- Date picker para fecha requerida
- Inputs con `onWheel` blur para números
- Toast notifications

**Campos:**
- Título *(requerido)*
- Categoría *(requerido)*
- Prioridad *(requerido)*
- Fecha requerida *(requerido)*
- Descripción del item *(requerido)*
- Cantidad *(requerido)*
- Precio unitario *(requerido)*
- Moneda (PEN/USD)
- Justificación *(requerido)*
- Proveedor preferido *(opcional)*
- Centro de costo *(opcional)*
- Notas *(opcional)*

**Uso:**
```tsx
<CreatePRForm
  onSuccess={(prId, isDraft) => {
    console.log(`PR ${prId} ${isDraft ? 'guardada' : 'enviada'}`);
    router.push(`/pr/${prId}`);
  }}
  onCancel={() => router.back()}
/>
```

---

### 7. PRDetailView.tsx

Vista completa de detalle de una PR con todos sus datos.

**Props:**
```typescript
{
  data: PRDetailViewData;  // Data completa de la PR (incluye pr, category, history, comments, permisos)
  userId: string;          // ID del usuario actual
  onUpdate: () => void;    // Callback para recargar data después de acciones
}
```

**Features:**
- Layout responsive con grid (2 columnas en desktop)
- Muestra todos los datos de la PR organizados en secciones
- Timeline integrado
- Botones de acción según permisos:
  - Aprobar (solo si `can_approve`)
  - Rechazar (solo si `can_approve`)
  - Cancelar (solo si `can_cancel`)
- Sección para agregar comentarios (con opción de marcar como interno)
- Modals para confirmar rechazo/cancelación

**Uso:**
```tsx
const data = await getPRById(prId);

<PRDetailView
  data={data}
  userId={currentUser.id}
  onUpdate={reloadPR}
/>
```

---

## Instalación de Dependencias

Los componentes requieren:

```bash
npm install date-fns  # Para formateo de fechas
```

Ya instaladas en el proyecto:
- `lucide-react` (iconos)
- `sonner` (toast notifications)
- `tailwindcss` (estilos)

---

## Colores y Estilo

Los componentes siguen los colores corporativos definidos en `lib/types/purchase-requisitions.ts`:

### Estados (PRStatus)
- **draft**: Gray - 📝
- **submitted**: Blue - 📤
- **pending_approval**: Yellow - ⏳
- **approved**: Green - ✅
- **rejected**: Red - ❌
- **completed**: Teal - 🎉
- **cancelled**: Gray - 🚫

### Prioridades (PRPriority)
- **urgent**: Red - 🔴
- **high**: Orange - 🟠
- **normal**: Blue - 🔵
- **low**: Gray - ⚪

---

## Server Actions Utilizadas

Los componentes usan las siguientes Server Actions de `@/lib/actions-purchase-requisitions`:

### Lectura
- `getCategories()` - Obtener categorías activas
- `getPRById(id)` - Obtener PR con data completa
- `getMyPRs(filters?, pagination?)` - Mis PRs como solicitante
- `getPendingApprovals()` - PRs pendientes de mi aprobación
- `getAllPRs(filters?, pagination?)` - Todas las PRs (admin)
- `getApprovalRuleForAmount(amount)` - Regla de aprobación aplicable

### Escritura
- `createPR(input)` - Crear nueva PR (draft)
- `updatePR(id, input)` - Actualizar PR (solo draft)
- `submitPR(prId)` - Enviar PR a aprobación
- `approvePR(input)` - Aprobar PR
- `rejectPR(input)` - Rechazar PR
- `cancelPR(input)` - Cancelar PR
- `completePR(prId)` - Marcar como completada
- `addPRComment(input)` - Agregar comentario

---

## Integración con Páginas

Ver `EJEMPLO_USO.tsx` para ejemplos completos de cómo integrar los componentes en páginas.

### Páginas Sugeridas

1. **`/purchase-requisitions/mis-solicitudes`** - Lista de mis PRs con botón "Nueva Solicitud"
2. **`/purchase-requisitions/aprobaciones`** - Bandeja de aprobación
3. **`/purchase-requisitions/[id]`** - Vista de detalle de una PR
4. **`/purchase-requisitions/dashboard`** - Dashboard con estadísticas

---

## Responsive Design

Todos los componentes son mobile-first:

- **Desktop**: Tablas completas, grids de 2-3 columnas
- **Tablet**: Grids adaptativos
- **Mobile**: Cards apiladas, layouts de 1 columna

Breakpoints de Tailwind usados: `sm:`, `md:`, `lg:`

---

## Accesibilidad

- Todos los botones tienen labels descriptivos
- Inputs tienen labels asociados
- Modals con `role="dialog"` y `aria-modal="true"`
- ESC key para cerrar modals
- Body scroll lock cuando modal está abierto
- Focus states en todos los elementos interactivos

---

## Testing

Para testing con Playwright MCP:

```typescript
// Navegar a página de PRs
await mcp__playwright__browser_navigate({ url: 'http://localhost:3000/purchase-requisitions' });

// Tomar screenshot
await mcp__playwright__browser_take_screenshot({ name: 'pr-list' });

// Click en botón "Nueva Solicitud"
await mcp__playwright__browser_click({ selector: 'button:has-text("Nueva Solicitud")' });

// Llenar formulario
await mcp__playwright__browser_type({ selector: 'input[name="title"]', text: 'Test PR' });

// Verificar elementos
await mcp__playwright__browser_snapshot();
```

---

## Notas Importantes

1. **Input Number**: Todos los inputs numéricos tienen `onWheel={(e) => e.currentTarget.blur()}` para evitar cambios accidentales con scroll.

2. **Toast Notifications**: Usa `sonner` para todas las notificaciones.

3. **Date Formatting**: Usa `date-fns` con locale español (`es`).

4. **TypeScript**: Todos los componentes están 100% tipados con tipos de `@/lib/types/purchase-requisitions`.

5. **'use client'**: Todos los componentes son Client Components.

---

## Troubleshooting

### Error: "Cannot find module 'date-fns'"
```bash
npm install date-fns
```

### Error: "Cannot find module '@/lib/actions-purchase-requisitions'"
Asegúrate de que el archivo de Server Actions existe y exporta todas las funciones.

### Estilos no se aplican
Verifica que Tailwind esté configurado correctamente y que el componente esté en la ruta `components/**/*.tsx`.

---

## Autor

Frontend Dev Agent - EcoPlaza Dashboard
Fecha: 13 Enero 2026
