# Cambio: Traducción de "Insights" a "Estadísticas"

Fecha: 14 Enero 2026
Estado: COMPLETADO

## Resumen

Se cambió la palabra "Insights" a "Estadísticas" en todos los menús laterales (Sidebar) y en el título de la página principal del dashboard.

## Archivos Modificados

### 1. components/shared/Sidebar.tsx

**Línea 145** (Superadmin/Admin):
```typescript
- { href: '/', label: 'Insights', icon: LayoutDashboard },
+ { href: '/', label: 'Estadísticas', icon: LayoutDashboard },
```

**Línea 167** (Comentario - Jefe Ventas):
```typescript
- // jefe_ventas tiene acceso a Insights, Operativo, Reportería (categoría), y Repulse
+ // jefe_ventas tiene acceso a Estadísticas, Operativo, Reportería (categoría), y Repulse
```

**Línea 182** (Jefe Ventas):
```typescript
- { href: '/', label: 'Insights', icon: LayoutDashboard },
+ { href: '/', label: 'Estadísticas', icon: LayoutDashboard },
```

**Línea 222** (Comentario - Marketing):
```typescript
- // marketing ve Insights, Operativo y Reportería
+ // marketing ve Estadísticas, Operativo y Reportería
```

**Línea 226** (Marketing):
```typescript
- { href: '/', label: 'Insights', icon: LayoutDashboard },
+ { href: '/', label: 'Estadísticas', icon: LayoutDashboard },
```

### 2. app/page.tsx

**Línea 95** (Título de DashboardHeader):
```typescript
- title="Insights"
+ title="Estadísticas"
```

## Roles Afectados

| Rol | Cambio | Ubicación |
|-----|--------|-----------|
| Superadmin | Sidebar: Insights → Estadísticas | Menu directo |
| Admin | Sidebar: Insights → Estadísticas | Menu directo |
| Jefe de Ventas | Sidebar: Insights → Estadísticas | Menu directo |
| Marketing | Sidebar: Insights → Estadísticas | Menu directo |
| Todos | Page Title: Insights → Estadísticas | Home page (/) |

## Verificación

```bash
# Verificar cambios en Sidebar
grep -n "Estadísticas" components/shared/Sidebar.tsx
# Resultado: 4 líneas con "Estadísticas"

# Verificar cambios en page.tsx
grep -n "Estadísticas" app/page.tsx
# Resultado: 1 línea con "Estadísticas"

# Verificar NO quedan instancias de "Insights" como label
grep -r "label.*Insights" components/ app/
# Resultado: (vacío - todas reemplazadas)
```

## Impacto en UX

- Terminología consistente en español
- Menú lateral más profesional y localizado
- Mejor comprensión para usuarios hispanohablantes
- Sin cambios funcionales, solo visuales

## Testing Recomendado

1. Login como Superadmin: Verificar "Estadísticas" en Sidebar
2. Login como Jefe Ventas: Verificar "Estadísticas" en Sidebar
3. Login como Marketing: Verificar "Estadísticas" en Sidebar
4. Hacer clic en "Estadísticas": Debe abrir dashboard con ese título en header
