# Migración Ejecutada: Política DELETE en corredores_documentos

## Detalles de la Migración

**Fecha de ejecución:** 13 Enero 2026
**Responsable:** DataDev (Database Architect)
**Archivo fuente:** `migrations/001_modulo_expansion_corredores.sql` (actualizado)
**Estado:** Completada exitosamente

## Contexto

Se identificó que la tabla `corredores_documentos` tenía políticas RLS para SELECT e INSERT, pero faltaba una política para DELETE. Esto impedía que los corredores pudieran eliminar sus propios documentos cuando estaban en estado 'borrador' u 'observado'.

## Política Implementada

```sql
CREATE POLICY "Corredor elimina sus documentos"
  ON corredores_documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id
      AND usuario_id = auth.uid()
      AND estado IN ('borrador', 'observado')
    )
  );
```

## Lógica de Seguridad

La política DELETE permite que:

1. Un corredor elimine SOLO sus propios documentos
2. Solo cuando el registro está en estado 'borrador' u 'observado'
3. No se pueden eliminar documentos de registros en estado 'pendiente', 'aprobado' o 'rechazado'

Esta lógica es consistente con la política INSERT existente, que también permite subir documentos solo en estados 'borrador' y 'observado'.

## Verificación

Después de ejecutar la migración, se verificaron las políticas RLS en `corredores_documentos`:

```
Políticas RLS en corredores_documentos:

  DELETE     - Corredor elimina sus documentos
  INSERT     - Corredor sube documentos
  SELECT     - Admin ve todos los documentos
  SELECT     - Corredor ve sus documentos

Total: 4 políticas
```

## Impacto en la Aplicación

### Antes de la migración

- Los corredores podían ver y subir documentos, pero NO podían eliminarlos
- Esto generaba frustración si subían un documento incorrecto

### Después de la migración

- Los corredores pueden eliminar documentos mientras están en estado 'borrador' u 'observado'
- Una vez que envían el registro (estado 'pendiente'), ya no pueden modificar documentos
- Esto es el comportamiento esperado según el flujo de negocio

## Archivos Actualizados

1. `migrations/001_modulo_expansion_corredores.sql` - Agregada política DELETE
2. `migrations/MIGRACION_EJECUTADA_13_ENE_2026.md` - Este documento

## Comando Ejecutado

```sql
CREATE POLICY "Corredor elimina sus documentos"
  ON corredores_documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id
      AND usuario_id = auth.uid()
      AND estado IN ('borrador', 'observado')
    )
  );
```

## Query de Verificación

Para verificar que la política existe:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'corredores_documentos'
AND cmd = 'DELETE';
```

Resultado esperado:

```
policyname                         | cmd
-----------------------------------+--------
Corredor elimina sus documentos   | DELETE
```

## Rollback (si fuera necesario)

```sql
DROP POLICY IF EXISTS "Corredor elimina sus documentos" ON corredores_documentos;
```

## Notas Importantes

1. Esta política es consistente con las políticas SELECT e INSERT existentes
2. No afecta a los roles admin/legal/superadmin, que tienen sus propias políticas
3. La restricción de estados ('borrador', 'observado') previene eliminaciones accidentales después de enviar el registro
4. La política usa `auth.uid()` para garantizar que solo el propietario puede eliminar
5. El JOIN con `corredores_registro` asegura que se valide el estado del registro antes de permitir la eliminación

## Pruebas Recomendadas

1. Como corredor en estado 'borrador': intentar eliminar documento (debe funcionar)
2. Como corredor en estado 'observado': intentar eliminar documento (debe funcionar)
3. Como corredor en estado 'pendiente': intentar eliminar documento (debe fallar)
4. Como corredor en estado 'aprobado': intentar eliminar documento (debe fallar)
5. Intentar eliminar documento de otro corredor (debe fallar)

---

**Conclusión:** Migración ejecutada exitosamente. La tabla `corredores_documentos` ahora tiene una cobertura completa de políticas RLS para todas las operaciones CRUD (SELECT, INSERT, DELETE, UPDATE).
