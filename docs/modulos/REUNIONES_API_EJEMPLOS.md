# Módulo de Reuniones - Ejemplos de Uso de APIs

**Fecha:** 6 Enero 2026
**Para:** Frontend Developer
**Backend:** ✅ Completamente Implementado

---

## Índice

1. [Upload de Reunión](#1-upload-de-reunión)
2. [Obtener Lista de Reuniones](#2-obtener-lista-de-reuniones)
3. [Obtener Detalle de Reunión](#3-obtener-detalle-de-reunión)
4. [Procesar Reunión (IA)](#4-procesar-reunión-ia)
5. [Marcar Action Item Completado](#5-marcar-action-item-completado)
6. [Obtener Mis Pendientes](#6-obtener-mis-pendientes)
7. [Hooks Sugeridos](#7-hooks-sugeridos)

---

## 1. Upload de Reunión

### Frontend Component (React)

```typescript
// components/reuniones/NuevaReunionModal.tsx

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function NuevaReunionModal() {
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  async function handleUpload() {
    if (!file || !titulo || !proyectoId) {
      alert('Completa todos los campos');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('titulo', titulo);
      formData.append('proyecto_id', proyectoId);

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autorizado');

      const response = await fetch('/api/reuniones/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al subir archivo');
      }

      // Iniciar procesamiento en background
      await fetch(`/api/reuniones/${data.reunionId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      alert('Reunión subida! Procesando en segundo plano...');
      router.push(`/reuniones/${data.reunionId}`);

    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2>Nueva Reunión</h2>

      <input
        type="text"
        placeholder="Título de la reunión"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
        <option value="">Seleccionar proyecto</option>
        {/* Cargar proyectos dinámicamente */}
      </select>

      <input
        type="file"
        accept="audio/*,video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Subiendo...' : 'Subir Reunión'}
      </button>

      {uploading && <progress value={progress} max={100} />}
    </div>
  );
}
```

---

## 2. Obtener Lista de Reuniones

### Server Action

```typescript
// app/(routes)/reuniones/page.tsx

import { getReuniones } from '@/lib/actions-reuniones';

export default async function ReunionesPage({
  searchParams
}: {
  searchParams: { proyecto?: string; estado?: string; page?: string }
}) {
  const page = parseInt(searchParams.page || '1');
  const limit = 20;
  const offset = (page - 1) * limit;

  const result = await getReuniones({
    proyecto_id: searchParams.proyecto,
    estado: searchParams.estado as any,
    limit,
    offset
  });

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  return (
    <div>
      <h1>Reuniones</h1>

      {/* Filtros */}
      <div>
        <select name="proyecto">
          <option value="">Todos los proyectos</option>
          {/* Proyectos dinámicos */}
        </select>

        <select name="estado">
          <option value="">Todos los estados</option>
          <option value="procesando">Procesando</option>
          <option value="completado">Completado</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Lista */}
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {result.reuniones.map((reunion) => (
            <tr key={reunion.id}>
              <td>{reunion.titulo}</td>
              <td>{new Date(reunion.created_at).toLocaleDateString()}</td>
              <td>
                <EstadoBadge estado={reunion.estado} />
              </td>
              <td>
                <a href={`/reuniones/${reunion.id}`}>Ver detalle</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginación */}
      <div>
        {page > 1 && <a href={`?page=${page - 1}`}>Anterior</a>}
        {result.hasMore && <a href={`?page=${page + 1}`}>Siguiente</a>}
      </div>
    </div>
  );
}
```

---

## 3. Obtener Detalle de Reunión

### Server Action

```typescript
// app/(routes)/reuniones/[id]/page.tsx

import { getReunionDetalle } from '@/lib/actions-reuniones';
import { notFound } from 'next/navigation';

export default async function ReunionDetallePage({
  params
}: {
  params: { id: string }
}) {
  const result = await getReunionDetalle(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { reunion, actionItems } = result.data;

  return (
    <div>
      <h1>{reunion.titulo}</h1>

      {/* Estado */}
      <EstadoBadge estado={reunion.estado} />

      {/* Tabs */}
      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="action-items">
            Action Items ({actionItems.length})
          </TabsTrigger>
          <TabsTrigger value="transcripcion">Transcripción</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="resumen">
          {reunion.estado === 'procesando' && (
            <div>Procesando... Por favor espera.</div>
          )}

          {reunion.estado === 'completado' && (
            <div>
              <h2>Resumen</h2>
              <p>{reunion.resumen}</p>

              <h3>Puntos Clave</h3>
              <ul>
                {reunion.puntos_clave?.map((punto, i) => (
                  <li key={i}>{punto}</li>
                ))}
              </ul>

              <h3>Decisiones</h3>
              <ul>
                {reunion.decisiones?.map((decision, i) => (
                  <li key={i}>{decision}</li>
                ))}
              </ul>

              <h3>Participantes</h3>
              <div>
                {reunion.participantes?.join(', ')}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab: Action Items */}
        <TabsContent value="action-items">
          <ActionItemsList items={actionItems} />
        </TabsContent>

        {/* Tab: Transcripción */}
        <TabsContent value="transcripcion">
          {reunion.estado === 'completado' && (
            <pre>{reunion.transcripcion_completa}</pre>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 4. Procesar Reunión (IA)

### Client Component

```typescript
// Esta llamada normalmente se hace automáticamente después del upload
// Pero puede hacerse manualmente si falla

'use client';

import { useState } from 'react';

export function ReprocessButton({ reunionId }: { reunionId: string }) {
  const [processing, setProcessing] = useState(false);

  async function handleReprocess() {
    setProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autorizado');

      const response = await fetch(`/api/reuniones/${reunionId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al procesar');
      }

      alert('Procesamiento iniciado. Refresca la página en unos minutos.');
      window.location.reload();

    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <button onClick={handleReprocess} disabled={processing}>
      {processing ? 'Procesando...' : 'Re-procesar con IA'}
    </button>
  );
}
```

---

## 5. Marcar Action Item Completado

### Client Component

```typescript
'use client';

import { markActionItemCompleted } from '@/lib/actions-action-items';
import { useState } from 'react';

export function ActionItemCheckbox({
  actionItemId,
  initialCompletado
}: {
  actionItemId: string;
  initialCompletado: boolean;
}) {
  const [completado, setCompletado] = useState(initialCompletado);
  const [updating, setUpdating] = useState(false);

  async function handleToggle() {
    setUpdating(true);

    try {
      const result = await markActionItemCompleted(actionItemId, !completado);

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar');
      }

      setCompletado(!completado);
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <input
      type="checkbox"
      checked={completado}
      onChange={handleToggle}
      disabled={updating}
    />
  );
}
```

---

## 6. Obtener Mis Pendientes

### Server Action

```typescript
// app/(routes)/mis-pendientes/page.tsx

import { getUserActionItems } from '@/lib/actions-action-items';

export default async function MisPendientesPage() {
  const result = await getUserActionItems(false); // Solo pendientes

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  const pendientes = result.actionItems.filter(item => !item.completado);
  const completados = result.actionItems.filter(item => item.completado);

  return (
    <div>
      <h1>Mis Pendientes</h1>

      <section>
        <h2>Pendientes ({pendientes.length})</h2>
        {pendientes.map((item) => (
          <ActionItemCard key={item.id} item={item} />
        ))}
      </section>

      <section>
        <h2>Completados ({completados.length})</h2>
        {completados.map((item) => (
          <ActionItemCard key={item.id} item={item} />
        ))}
      </section>
    </div>
  );
}

function ActionItemCard({ item }: { item: ActionItemWithReunion }) {
  return (
    <div>
      <ActionItemCheckbox
        actionItemId={item.id}
        initialCompletado={item.completado}
      />

      <div>
        <strong>{item.descripcion}</strong>
        <p>De la reunión: {item.reunion_titulo}</p>
        <p>Deadline: {item.deadline || 'Sin fecha'}</p>
        <span>Prioridad: {item.prioridad}</span>
      </div>
    </div>
  );
}
```

---

## 7. Hooks Sugeridos

### useReuniones Hook

```typescript
// hooks/useReuniones.ts

import { useState, useEffect } from 'react';
import { getReuniones } from '@/lib/actions-reuniones';
import { Reunion } from '@/types/reuniones';

export function useReuniones(params?: {
  proyecto_id?: string;
  estado?: string;
}) {
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReuniones() {
      setLoading(true);
      const result = await getReuniones(params);

      if (result.success) {
        setReuniones(result.reuniones);
      } else {
        setError(result.error || 'Error desconocido');
      }

      setLoading(false);
    }

    fetchReuniones();
  }, [params?.proyecto_id, params?.estado]);

  return { reuniones, loading, error };
}
```

### useReunionUpload Hook

```typescript
// hooks/useReunionUpload.ts

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function useReunionUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function uploadReunion({
    file,
    titulo,
    proyectoId,
    fechaReunion
  }: {
    file: File;
    titulo: string;
    proyectoId: string;
    fechaReunion?: string;
  }) {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('titulo', titulo);
      formData.append('proyecto_id', proyectoId);
      if (fechaReunion) formData.append('fecha_reunion', fechaReunion);

      // Obtener token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autorizado');

      // Upload
      const response = await fetch('/api/reuniones/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al subir');
      }

      // Procesar
      await fetch(`/api/reuniones/${data.reunionId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      // Redirigir
      router.push(`/reuniones/${data.reunionId}`);

      return { success: true, reunionId: data.reunionId };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }

  return { uploadReunion, uploading, progress, error };
}
```

### useActionItems Hook

```typescript
// hooks/useActionItems.ts

import { useState, useEffect } from 'react';
import { getUserActionItems } from '@/lib/actions-action-items';
import { ActionItemWithReunion } from '@/types/reuniones';

export function useActionItems(includeCompleted: boolean = false) {
  const [actionItems, setActionItems] = useState<ActionItemWithReunion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActionItems() {
      setLoading(true);
      const result = await getUserActionItems(includeCompleted);

      if (result.success) {
        setActionItems(result.actionItems);
      } else {
        setError(result.error || 'Error desconocido');
      }

      setLoading(false);
    }

    fetchActionItems();
  }, [includeCompleted]);

  return { actionItems, loading, error, refetch: () => {} };
}
```

---

## Ejemplo de Flujo Completo

### 1. Usuario sube reunión

```typescript
const { uploadReunion } = useReunionUpload();

await uploadReunion({
  file: selectedFile,
  titulo: 'Reunión Semanal',
  proyectoId: 'chincha-uuid'
});

// → Redirige automáticamente a /reuniones/[id]
```

### 2. Usuario ve el detalle

```typescript
// La página carga el detalle con getReunionDetalle()
// Estado inicial: "procesando"
```

### 3. IA procesa en background

```typescript
// Whisper transcribe
// GPT-4 genera resumen y action items
// Estado cambia a "completado"
```

### 4. Usuario refresca y ve el resumen

```typescript
// Resumen, puntos clave, decisiones visibles
// Action items listados
```

### 5. Usuario marca action items

```typescript
await markActionItemCompleted(actionItemId, true);
// ✅ Completado!
```

---

## Tipos TypeScript Importantes

```typescript
import {
  Reunion,
  ReunionActionItem,
  ReunionEstado,
  Prioridad,
  ActionItemWithReunion
} from '@/types/reuniones';

// Usar en tus componentes para type safety
```

---

## Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `401 Unauthorized` | Token inválido | Verificar sesión con `supabase.auth.getSession()` |
| `File too large` | Archivo >2GB | Reducir tamaño antes de upload |
| `Invalid file type` | Tipo no soportado | Solo audio/video (mp3, mp4, wav, etc.) |
| `403 Forbidden` | Rol insuficiente | Solo admin/gerencia/jefe_ventas pueden subir |

---

## Testing Recomendado

```typescript
// __tests__/reuniones/upload.test.tsx

import { render, fireEvent, waitFor } from '@testing-library/react';
import { NuevaReunionModal } from '@/components/reuniones/NuevaReunionModal';

test('debe subir reunión correctamente', async () => {
  const { getByLabelText, getByText } = render(<NuevaReunionModal />);

  const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });

  fireEvent.change(getByLabelText('Archivo'), { target: { files: [file] } });
  fireEvent.change(getByLabelText('Título'), { target: { value: 'Test' } });
  fireEvent.click(getByText('Subir Reunión'));

  await waitFor(() => {
    expect(getByText('Subido correctamente')).toBeInTheDocument();
  });
});
```

---

## Conclusión

Todos los ejemplos anteriores usan las APIs implementadas en el backend. El frontend puede consumirlas directamente usando:

1. **Server Actions** (preferido) - `lib/actions-*.ts`
2. **API Routes** (cuando se necesita fetch directo) - `/api/reuniones/*`

**Recomendación:** Usar Server Actions para mejor experiencia de desarrollo y type safety.

---

**Documentado por:** backend-dev
**Fecha:** 6 Enero 2026
**Para:** frontend-dev
