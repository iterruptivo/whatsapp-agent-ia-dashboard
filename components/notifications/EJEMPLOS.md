# Ejemplos de Uso - Módulo de Notificaciones

## Ejemplos de integración con otros módulos del sistema

---

## 1. Leads - Asignar Lead a Vendedor

```tsx
// En: lib/actions-leads.ts
import { notifyLeadAssigned } from '@/lib/actions-notifications';

export async function asignarLead(leadId: string, vendedorId: string) {
  const lead = await getLeadById(leadId);
  const proyecto = await getProyectoById(lead.proyecto_id);
  const asignador = await getCurrentUser();

  // Actualizar lead en DB
  await supabase
    .from('leads')
    .update({ asignado_a: vendedorId })
    .eq('id', leadId);

  // NOTIFICAR al vendedor
  await notifyLeadAssigned({
    assignee_id: vendedorId,
    lead_id: leadId,
    lead_nombre: lead.nombre,
    lead_telefono: lead.telefono,
    proyecto_id: proyecto.id,
    proyecto_nombre: proyecto.nombre,
    actor_id: asignador.id,
    actor_name: asignador.nombre,
  });

  return { success: true };
}
```

---

## 2. Control de Pagos - Pago Registrado

```tsx
// En: lib/actions-pagos.ts
import { notifyPaymentRegistered } from '@/lib/actions-notifications';

export async function registrarPago(data: PagoInput) {
  const pago = await supabase
    .from('pagos')
    .insert(data)
    .select()
    .single();

  // Obtener usuarios del rol finanzas
  const finanzasUsers = await supabase
    .from('usuarios')
    .select('id')
    .eq('rol', 'finanzas');

  const finanzasIds = finanzasUsers.data?.map(u => u.id) || [];

  // NOTIFICAR a todos los usuarios de finanzas
  await notifyPaymentRegistered({
    finanzas_user_ids: finanzasIds,
    pago_id: pago.id,
    monto: pago.monto,
    local_codigo: pago.local_codigo,
    cliente_nombre: pago.cliente_nombre,
    registrado_por: currentUser.nombre,
  });

  return { success: true, pago };
}
```

---

## 3. Aprobaciones - Solicitud Pendiente

```tsx
// En: lib/actions-aprobaciones.ts (Purchase Requisitions)
import { notifyPRPendingApproval } from '@/lib/actions-notifications';

export async function crearSolicitudCompra(data: PRInput) {
  const pr = await supabase
    .from('purchase_requisitions')
    .insert(data)
    .select()
    .single();

  // Determinar aprobador según monto
  const aprobadorId = data.monto > 10000
    ? await getGerenciaUserId()
    : await getJefeAreaUserId(data.area);

  // NOTIFICAR al aprobador
  await notifyPRPendingApproval({
    approver_id: aprobadorId,
    pr_id: pr.id,
    pr_number: pr.numero,
    amount: pr.monto,
    currency: pr.moneda,
    requester_id: currentUser.id,
    requester_name: currentUser.nombre,
    title: pr.titulo,
  });

  return { success: true, pr };
}
```

---

## 4. Comisiones - Comisión Calculada

```tsx
// En: lib/actions-comisiones.ts
import { createNotification } from '@/lib/actions-notifications';

export async function calcularComisiones(periodoId: string) {
  const comisiones = await calcularComisionesPeriodo(periodoId);

  // NOTIFICAR a cada vendedor sobre su comisión
  for (const comision of comisiones) {
    await createNotification({
      user_id: comision.vendedor_id,
      type: 'commission_calculated',
      category: 'comisiones',
      priority: 'normal',
      title: 'Comisión calculada',
      message: `Tu comisión del mes es S/ ${comision.monto.toLocaleString()}`,
      metadata: {
        comision_id: comision.id,
        monto: comision.monto,
        periodo: periodoId,
      },
      action_url: '/comisiones',
      action_label: 'Ver detalle',
    });
  }

  return { success: true, count: comisiones.length };
}
```

---

## 5. Expansión - Corredor Registrado

```tsx
// En: lib/actions-expansion.ts
import { createNotification } from '@/lib/actions-notifications';

export async function registrarCorredor(data: CorredorInput) {
  const corredor = await supabase
    .from('corredores')
    .insert(data)
    .select()
    .single();

  // Obtener usuarios del rol legal
  const legalUsers = await supabase
    .from('usuarios')
    .select('id')
    .eq('rol', 'legal');

  // NOTIFICAR a todos los usuarios legales
  for (const legal of legalUsers.data || []) {
    await createNotification({
      user_id: legal.id,
      type: 'corredor_registered',
      category: 'expansion',
      priority: 'high',
      title: 'Nuevo corredor registrado',
      message: `${data.nombre} ha completado su registro y requiere revisión`,
      metadata: {
        corredor_id: corredor.id,
        corredor_nombre: data.nombre,
        corredor_email: data.email,
      },
      action_url: `/expansion/inbox/${corredor.id}`,
      action_label: 'Revisar solicitud',
      actor_id: corredor.user_id,
      actor_name: data.nombre,
    });
  }

  return { success: true, corredor };
}
```

---

## 6. Reuniones - Transcripción Lista

```tsx
// En: lib/actions-reuniones.ts
import { createNotification } from '@/lib/actions-notifications';

export async function procesarTranscripcion(reunionId: string) {
  const reunion = await getReunionById(reunionId);
  const transcripcion = await processarAudioConWhisper(reunion.audio_url);

  // Actualizar reunión con transcripción
  await supabase
    .from('reuniones')
    .update({ transcripcion, estado: 'transcrita' })
    .eq('id', reunionId);

  // NOTIFICAR a todos los participantes
  for (const participante of reunion.participantes) {
    await createNotification({
      user_id: participante.user_id,
      type: 'transcription_ready',
      category: 'reuniones',
      priority: 'low',
      title: 'Transcripción lista',
      message: `La transcripción de la reunión "${reunion.titulo}" está disponible`,
      metadata: {
        reunion_id: reunionId,
        reunion_titulo: reunion.titulo,
        fecha: reunion.fecha,
      },
      action_url: `/reuniones/${reunionId}`,
      action_label: 'Ver transcripción',
    });
  }

  return { success: true };
}
```

---

## 7. Sistema - Anuncio Global

```tsx
// En: lib/actions-admin.ts (o un admin panel)
import { sendBulkNotification } from '@/lib/actions-notifications';

export async function enviarAnuncioGlobal(mensaje: string) {
  // Obtener todos los usuarios activos
  const users = await supabase
    .from('usuarios')
    .select('id')
    .eq('activo', true);

  const userIds = users.data?.map(u => u.id) || [];

  // NOTIFICAR a todos
  const result = await sendBulkNotification(userIds, {
    type: 'system_announcement',
    category: 'system',
    priority: 'normal',
    title: 'Anuncio importante',
    message: mensaje,
    action_url: '/dashboard',
    action_label: 'Ver más',
  });

  return result;
}
```

---

## 8. Workflow Completo - Flujo de Aprobación PR

```tsx
// En: lib/actions-aprobaciones.ts

// 1. Crear PR
export async function crearPR(data: PRInput) {
  const pr = await insertPR(data);

  // Notificar a aprobador nivel 1
  await notifyPRPendingApproval({
    approver_id: data.aprobador_nivel1_id,
    pr_id: pr.id,
    pr_number: pr.numero,
    amount: pr.monto,
    currency: pr.moneda,
    requester_id: currentUser.id,
    requester_name: currentUser.nombre,
    title: pr.titulo,
  });

  return { success: true, pr };
}

// 2. Aprobar PR (nivel 1)
export async function aprobarPRNivel1(prId: string) {
  const pr = await getPRById(prId);

  await supabase
    .from('purchase_requisitions')
    .update({ estado: 'aprobado_nivel1' })
    .eq('id', prId);

  // Notificar a requester
  await createNotification({
    user_id: pr.requester_id,
    type: 'pr_approved',
    category: 'purchase_requisitions',
    priority: 'normal',
    title: `PR ${pr.numero} aprobada (Nivel 1)`,
    message: 'Tu solicitud avanza a siguiente nivel de aprobación',
    action_url: `/solicitudes-compra/${prId}`,
    action_label: 'Ver PR',
    actor_name: currentUser.nombre,
  });

  // Si requiere nivel 2, notificar
  if (pr.monto > 50000) {
    await notifyPRPendingApproval({
      approver_id: pr.aprobador_nivel2_id,
      pr_id: pr.id,
      pr_number: pr.numero,
      amount: pr.monto,
      currency: pr.moneda,
      requester_id: pr.requester_id,
      requester_name: pr.requester_name,
      title: pr.titulo,
    });
  }

  return { success: true };
}

// 3. Rechazar PR
export async function rechazarPR(prId: string, razon: string) {
  const pr = await getPRById(prId);

  await supabase
    .from('purchase_requisitions')
    .update({ estado: 'rechazada', razon_rechazo: razon })
    .eq('id', prId);

  // Notificar a requester
  await notifyPRRejected({
    requester_id: pr.requester_id,
    pr_id: pr.id,
    pr_number: pr.numero,
    amount: pr.monto,
    approver_name: currentUser.nombre,
    rejection_reason: razon,
  });

  return { success: true };
}
```

---

## 9. Notificación con Thread (conversación)

```tsx
// En: lib/actions-chat.ts
import { createNotification } from '@/lib/actions-notifications';

export async function responderComentario(
  comentarioId: string,
  respuesta: string
) {
  const comentario = await getComentarioById(comentarioId);

  const nuevoComentario = await insertComentario({
    parent_id: comentarioId,
    contenido: respuesta,
    autor_id: currentUser.id,
  });

  // NOTIFICAR al autor original (threading)
  await createNotification({
    user_id: comentario.autor_id,
    type: 'lead_contacted',
    category: 'leads',
    priority: 'normal',
    title: 'Nueva respuesta',
    message: `${currentUser.nombre} respondió a tu comentario`,
    metadata: {
      comentario_id: nuevoComentario.id,
      parent_id: comentarioId,
    },
    action_url: `/operativo?comentario=${comentarioId}`,
    action_label: 'Ver conversación',
    parent_id: comentarioId, // Threading
    thread_key: `comentario-${comentarioId}`,
    actor_id: currentUser.id,
    actor_name: currentUser.nombre,
    actor_avatar_url: currentUser.avatar_url,
  });

  return { success: true };
}
```

---

## 10. Notificación Programada (delay)

```tsx
// En: lib/actions-tareas.ts
import { createNotification } from '@/lib/actions-notifications';

export async function crearTareaConRecordatorio(data: TareaInput) {
  const tarea = await insertTarea(data);

  // Notificar inmediatamente
  await createNotification({
    user_id: data.asignado_a,
    type: 'approval_requested',
    category: 'aprobaciones',
    priority: 'normal',
    title: 'Nueva tarea asignada',
    message: `${currentUser.nombre} te asignó: ${data.titulo}`,
    action_url: `/tareas/${tarea.id}`,
    action_label: 'Ver tarea',
  });

  // Programar recordatorio (24h antes)
  const recordatorioFecha = new Date(data.fecha_limite);
  recordatorioFecha.setDate(recordatorioFecha.getDate() - 1);

  await createNotification({
    user_id: data.asignado_a,
    type: 'approval_requested',
    category: 'aprobaciones',
    priority: 'high',
    title: 'Recordatorio: Tarea pendiente',
    message: `La tarea "${data.titulo}" vence mañana`,
    action_url: `/tareas/${tarea.id}`,
    action_label: 'Ver tarea',
    expires_at: data.fecha_limite, // Auto-expire después de la fecha límite
  });

  return { success: true, tarea };
}
```

---

## Best Practices

### 1. Usar helpers específicos cuando estén disponibles

```tsx
// ✅ BIEN
await notifyLeadAssigned({ ... });

// ❌ EVITAR (usar genérico)
await createNotification({
  type: 'lead_assigned',
  category: 'leads',
  ...
});
```

### 2. Incluir metadata útil

```tsx
await createNotification({
  // ...
  metadata: {
    lead_id: '123',
    proyecto_id: '456',
    monto: 10000,
    // Cualquier dato que ayude a procesar la notificación
  },
});
```

### 3. Action URLs claros

```tsx
// ✅ BIEN
action_url: '/operativo?lead=123&tab=historial'

// ❌ EVITAR (demasiado genérico)
action_url: '/operativo'
```

### 4. Prioridades correctas

```tsx
// Urgente: Requiere acción inmediata
priority: 'urgent'  // Solo para emergencias

// Alta: Importante pero no crítico
priority: 'high'    // Aprobaciones, pagos, etc.

// Normal: La mayoría de notificaciones
priority: 'normal'  // Default

// Baja: Informativa
priority: 'low'     // Transcripciones, reportes
```

### 5. Batch notifications cuando sea posible

```tsx
// ✅ BIEN
await sendBulkNotification([id1, id2, id3], { ... });

// ❌ EVITAR (loop con múltiples queries)
for (const id of ids) {
  await createNotification({ user_id: id, ... });
}
```
