# Ejemplos de Código - Sistema de Permisos de Reuniones

## Server Actions (Next.js)

### 1. Compartir con Usuario Específico

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function compartirReunionConUsuario(
  reunionId: string,
  usuarioId: string
) {
  const supabase = await createClient();

  // Verificar que el usuario actual tiene permisos para compartir
  const { data: session } = await supabase.auth.getUser();
  if (!session.user) {
    return { error: 'No autenticado' };
  }

  // Agregar usuario a permisos
  const { data, error } = await supabase.rpc('agregar_usuario_permitido', {
    reunion_id: reunionId,
    usuario_id: usuarioId
  });

  if (error) {
    console.error('Error compartiendo reunión:', error);
    return { error: error.message };
  }

  // Revalidar para refrescar UI
  revalidatePath('/reuniones');
  revalidatePath(`/reuniones/${reunionId}`);

  return { success: true };
}
```

### 2. Compartir con Rol

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function compartirReunionConRol(
  reunionId: string,
  rol: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('agregar_rol_permitido', {
    reunion_id: reunionId,
    rol_nombre: rol
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/reuniones');
  revalidatePath(`/reuniones/${reunionId}`);

  return { success: true };
}
```

### 3. Activar/Desactivar Link Público

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleLinkPublico(
  reunionId: string,
  activar: boolean
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('toggle_acceso_publico_reunion', {
    reunion_id: reunionId,
    activar: activar
  });

  if (error) {
    return { error: error.message };
  }

  // Obtener el link_token si se activó
  let linkToken = null;
  if (activar) {
    const { data: reunion } = await supabase
      .from('reuniones')
      .select('link_token')
      .eq('id', reunionId)
      .single();

    linkToken = reunion?.link_token;
  }

  revalidatePath(`/reuniones/${reunionId}`);

  return {
    success: true,
    linkToken: linkToken,
    publicUrl: linkToken
      ? `${process.env.NEXT_PUBLIC_APP_URL}/reuniones/compartido/${linkToken}`
      : null
  };
}
```

### 4. Regenerar Link Token

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function regenerarLinkToken(reunionId: string) {
  const supabase = await createClient();

  const { data: nuevoToken, error } = await supabase.rpc(
    'regenerar_link_token_reunion',
    { reunion_id: reunionId }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/reuniones/${reunionId}`);

  return {
    success: true,
    linkToken: nuevoToken,
    publicUrl: `${process.env.NEXT_PUBLIC_APP_URL}/reuniones/compartido/${nuevoToken}`
  };
}
```

### 5. Remover Permisos

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function removerPermisoUsuario(
  reunionId: string,
  usuarioId: string
) {
  const supabase = await createClient();

  const { error } = await supabase.rpc('remover_usuario_permitido', {
    reunion_id: reunionId,
    usuario_id: usuarioId
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/reuniones/${reunionId}`);
  return { success: true };
}

export async function removerPermisoRol(reunionId: string, rol: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc('remover_rol_permitido', {
    reunion_id: reunionId,
    rol_nombre: rol
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/reuniones/${reunionId}`);
  return { success: true };
}
```

## Componentes React

### Modal de Gestión de Permisos

```typescript
'use client';

import { useState } from 'react';
import { Reunion, Usuario } from '@/lib/db';
import {
  compartirReunionConUsuario,
  compartirReunionConRol,
  removerPermisoUsuario,
  removerPermisoRol,
  toggleLinkPublico,
  regenerarLinkToken
} from '@/app/actions/reuniones-permisos';

interface PermisosModalProps {
  reunion: Reunion;
  usuarios: Usuario[];
  onClose: () => void;
}

export function PermisosModal({ reunion, usuarios, onClose }: PermisosModalProps) {
  const [selectedUsuario, setSelectedUsuario] = useState('');
  const [selectedRol, setSelectedRol] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const handleCompartirUsuario = async () => {
    if (!selectedUsuario) return;

    setLoading(true);
    const result = await compartirReunionConUsuario(reunion.id, selectedUsuario);
    setLoading(false);

    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      setSelectedUsuario('');
      alert('Usuario agregado exitosamente');
    }
  };

  const handleCompartirRol = async () => {
    if (!selectedRol) return;

    setLoading(true);
    const result = await compartirReunionConRol(reunion.id, selectedRol);
    setLoading(false);

    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      setSelectedRol('');
      alert('Rol agregado exitosamente');
    }
  };

  const handleTogglePublico = async () => {
    setLoading(true);
    const result = await toggleLinkPublico(reunion.id, !reunion.es_publico);
    setLoading(false);

    if (result.error) {
      alert(`Error: ${result.error}`);
    } else if (result.publicUrl) {
      setPublicUrl(result.publicUrl);
      // Copiar al clipboard
      navigator.clipboard.writeText(result.publicUrl);
      alert('Link copiado al clipboard');
    }
  };

  const handleRegenerar = async () => {
    if (!confirm('¿Seguro? El link anterior dejará de funcionar')) return;

    setLoading(true);
    const result = await regenerarLinkToken(reunion.id);
    setLoading(false);

    if (result.error) {
      alert(`Error: ${result.error}`);
    } else if (result.publicUrl) {
      setPublicUrl(result.publicUrl);
      navigator.clipboard.writeText(result.publicUrl);
      alert('Nuevo link copiado al clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Gestionar Permisos</h2>
        <p className="text-gray-600 mb-6">{reunion.titulo}</p>

        {/* Link Público */}
        <div className="mb-6 p-4 border rounded">
          <h3 className="font-semibold mb-2">Link Público</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePublico}
              disabled={loading}
              className={`px-4 py-2 rounded ${
                reunion.es_publico
                  ? 'bg-red-500 text-white'
                  : 'bg-green-500 text-white'
              }`}
            >
              {reunion.es_publico ? 'Desactivar' : 'Activar'}
            </button>

            {reunion.es_publico && (
              <button
                onClick={handleRegenerar}
                disabled={loading}
                className="px-4 py-2 bg-yellow-500 text-white rounded"
              >
                Regenerar
              </button>
            )}
          </div>

          {(reunion.es_publico || publicUrl) && (
            <div className="mt-3 p-2 bg-gray-100 rounded text-sm font-mono break-all">
              {publicUrl ||
                `${process.env.NEXT_PUBLIC_APP_URL}/reuniones/compartido/${reunion.link_token}`}
            </div>
          )}
        </div>

        {/* Compartir con Usuario */}
        <div className="mb-6 p-4 border rounded">
          <h3 className="font-semibold mb-2">Compartir con Usuario</h3>
          <div className="flex gap-2">
            <select
              value={selectedUsuario}
              onChange={(e) => setSelectedUsuario(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            >
              <option value="">Seleccionar usuario...</option>
              {usuarios
                .filter((u) => !reunion.usuarios_permitidos.includes(u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol})
                  </option>
                ))}
            </select>
            <button
              onClick={handleCompartirUsuario}
              disabled={loading || !selectedUsuario}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {/* Lista de usuarios permitidos */}
          {reunion.usuarios_permitidos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {reunion.usuarios_permitidos.map((uid) => {
                const usuario = usuarios.find((u) => u.id === uid);
                return (
                  <li
                    key={uid}
                    className="flex justify-between items-center bg-gray-50 p-2 rounded"
                  >
                    <span>
                      {usuario?.nombre || uid} ({usuario?.rol})
                    </span>
                    <button
                      onClick={() => removerPermisoUsuario(reunion.id, uid)}
                      className="text-red-500 text-sm"
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Compartir con Rol */}
        <div className="mb-6 p-4 border rounded">
          <h3 className="font-semibold mb-2">Compartir con Rol</h3>
          <div className="flex gap-2">
            <select
              value={selectedRol}
              onChange={(e) => setSelectedRol(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            >
              <option value="">Seleccionar rol...</option>
              <option value="vendedor">Vendedor</option>
              <option value="coordinador">Coordinador</option>
              <option value="jefe_ventas">Jefe Ventas</option>
              <option value="finanzas">Finanzas</option>
              <option value="marketing">Marketing</option>
            </select>
            <button
              onClick={handleCompartirRol}
              disabled={loading || !selectedRol}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {/* Lista de roles permitidos */}
          {reunion.roles_permitidos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {reunion.roles_permitidos.map((rol) => (
                <li
                  key={rol}
                  className="flex justify-between items-center bg-gray-50 p-2 rounded"
                >
                  <span className="capitalize">{rol.replace('_', ' ')}</span>
                  <button
                    onClick={() => removerPermisoRol(reunion.id, rol)}
                    className="text-red-500 text-sm"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
```

### Página Pública para Link Compartido

```typescript
// app/reuniones/compartido/[token]/page.tsx

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ReunionCompartidaPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Obtener reunión por token (disponible para anon)
  const { data: reunion, error } = await supabase.rpc(
    'get_reunion_por_link_token',
    { token }
  );

  if (error || !reunion || reunion.length === 0) {
    notFound();
  }

  const reunionData = reunion[0];

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        {/* Header */}
        <div className="mb-6 pb-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900">
            {reunionData.titulo}
          </h1>
          {reunionData.fecha_reunion && (
            <p className="text-gray-600 mt-2">
              {new Date(reunionData.fecha_reunion).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>

        {/* Resumen */}
        {reunionData.resumen && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Resumen</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {reunionData.resumen}
            </p>
          </div>
        )}

        {/* Puntos Clave */}
        {reunionData.puntos_clave && reunionData.puntos_clave.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Puntos Clave</h2>
            <ul className="list-disc list-inside space-y-2">
              {reunionData.puntos_clave.map((punto: string, i: number) => (
                <li key={i} className="text-gray-700">
                  {punto}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisiones */}
        {reunionData.decisiones && reunionData.decisiones.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Decisiones</h2>
            <ul className="list-disc list-inside space-y-2">
              {reunionData.decisiones.map((decision: string, i: number) => (
                <li key={i} className="text-gray-700">
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preguntas Abiertas */}
        {reunionData.preguntas_abiertas &&
          reunionData.preguntas_abiertas.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Preguntas Abiertas</h2>
              <ul className="list-disc list-inside space-y-2">
                {reunionData.preguntas_abiertas.map(
                  (pregunta: string, i: number) => (
                    <li key={i} className="text-gray-700">
                      {pregunta}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

        {/* Transcripción Completa */}
        {reunionData.transcripcion_completa && (
          <div className="mb-6">
            <details className="border rounded p-4">
              <summary className="font-semibold cursor-pointer">
                Ver Transcripción Completa
              </summary>
              <div className="mt-4 text-gray-700 whitespace-pre-wrap text-sm">
                {reunionData.transcripcion_completa}
              </div>
            </details>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p>Reunión compartida por EcoPlaza Dashboard</p>
          <p className="mt-1">
            Generado: {new Date().toLocaleDateString('es-PE')}
          </p>
        </div>
      </div>
    </div>
  );
}
```

## API Routes

### Verificar Permisos antes de Servir Datos

```typescript
// app/api/reuniones/[id]/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Obtener sesión
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verificar permisos
  const { data: puedeVer } = await supabase.rpc('usuario_puede_ver_reunion', {
    reunion_id: id,
    usuario_id: user.id
  });

  if (!puedeVer) {
    return new Response('Forbidden', { status: 403 });
  }

  // Si tiene permisos, retornar datos
  const { data: reunion, error } = await supabase
    .from('reuniones')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(reunion);
}
```

## Utilidades

### Hook para Verificar Permisos

```typescript
// hooks/useReunionPermisos.ts

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useReunionPermisos(reunionId: string, userId: string) {
  const [puedeVer, setPuedeVer] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPermisos() {
      const supabase = createClient();

      const { data, error } = await supabase.rpc('usuario_puede_ver_reunion', {
        reunion_id: reunionId,
        usuario_id: userId
      });

      if (error) {
        console.error('Error verificando permisos:', error);
        setPuedeVer(false);
      } else {
        setPuedeVer(data);
      }

      setLoading(false);
    }

    checkPermisos();
  }, [reunionId, userId]);

  return { puedeVer, loading };
}
```

### Uso del Hook

```typescript
'use client';

import { useReunionPermisos } from '@/hooks/useReunionPermisos';

export function ReunionDetail({ reunionId, userId }: Props) {
  const { puedeVer, loading } = useReunionPermisos(reunionId, userId);

  if (loading) return <div>Verificando permisos...</div>;

  if (!puedeVer) {
    return <div>No tienes permiso para ver esta reunión</div>;
  }

  return <div>{/* Contenido de la reunión */}</div>;
}
```

## Testing

### Test de Permisos en Playwright

```typescript
// e2e/reuniones-permisos.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Sistema de Permisos de Reuniones', () => {
  test('Admin puede compartir reunión con vendedor', async ({ page }) => {
    // Login como admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'gerente.ti@ecoplaza.com.pe');
    await page.fill('[name="password"]', 'H#TJf8M%xjpTK@Vn');
    await page.click('button[type="submit"]');

    // Ir a reuniones
    await page.goto('/reuniones');

    // Seleccionar primera reunión
    await page.click('tr:first-child');

    // Abrir modal de permisos
    await page.click('button:has-text("Gestionar Permisos")');

    // Agregar rol vendedor
    await page.selectOption('select[name="rol"]', 'vendedor');
    await page.click('button:has-text("Agregar")');

    // Verificar éxito
    await expect(page.locator('text=Rol agregado exitosamente')).toBeVisible();
  });

  test('Link público funciona sin autenticación', async ({ page, context }) => {
    // Obtener link público (asumiendo que existe)
    const linkToken = 'uuid-del-test';

    // Abrir en contexto sin autenticación
    await context.clearCookies();
    await page.goto(`/reuniones/compartido/${linkToken}`);

    // Verificar que carga la reunión
    await expect(page.locator('h1')).toContainText('Reunión');
  });
});
```

## Mejores Prácticas

### 1. Siempre Verificar Permisos en el Backend

```typescript
// ❌ MAL: Confiar solo en el frontend
if (user.rol === 'admin') {
  // Mostrar datos sensibles
}

// ✅ BIEN: Verificar en el backend
const { data: puedeVer } = await supabase.rpc('usuario_puede_ver_reunion', {
  reunion_id: id,
  usuario_id: user.id
});

if (!puedeVer) {
  throw new Error('Forbidden');
}
```

### 2. Usar Revalidación de Paths

```typescript
// Después de cambiar permisos, revalidar
revalidatePath('/reuniones');
revalidatePath(`/reuniones/${reunionId}`);
```

### 3. Regenerar Tokens si se Comprometen

```typescript
// Si un link se filtra
await supabase.rpc('regenerar_link_token_reunion', {
  reunion_id: compromisedReunionId
});
```

### 4. Auditoría de Accesos

```typescript
// Crear tabla de logs (futura mejora)
CREATE TABLE reunion_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id UUID REFERENCES reuniones(id),
  usuario_id UUID REFERENCES usuarios(id),
  tipo_acceso TEXT, -- 'link_publico', 'permiso_directo', 'rol'
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Error: "Usuario no existe"

```typescript
// Asegurar que el usuario existe antes de agregar
const { data: usuario } = await supabase
  .from('usuarios')
  .select('id')
  .eq('id', usuarioId)
  .single();

if (!usuario) {
  throw new Error('Usuario no encontrado');
}
```

### Error: "Rol no válido"

```typescript
// Validar rol antes de agregar
const rolesValidos = [
  'admin',
  'gerencia',
  'vendedor',
  'jefe_ventas',
  'coordinador'
  // ... etc
];

if (!rolesValidos.includes(rol)) {
  throw new Error('Rol no válido');
}
```

### Link Público No Funciona

```typescript
// Verificar que es_publico = TRUE
const { data: reunion } = await supabase
  .from('reuniones')
  .select('es_publico, link_token')
  .eq('id', reunionId)
  .single();

if (!reunion.es_publico) {
  console.log('Reunión no es pública');
}
```
